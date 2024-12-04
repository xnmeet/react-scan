import { Monitor, Store } from '../..';
import {
  FLOAT_MAX_LEN,
  GZIP_MIN_LEN,
  GZIP_MAX_LEN,
  MAX_PENDING_REQUESTS,
} from './constants';
import { debounce, getSession } from './utils';
import { ScanInteraction, type IngestRequest, type Session } from './types';
import { Fiber } from 'react-reconciler';
function isFiberUnmounted(fiber: Fiber): boolean {
  if (!fiber) return true;

  if ((fiber.flags & /*Deletion=*/ 8) !== 0) return true;

  if (!fiber.return && fiber.tag !== /*HostRoot=*/ 3) return true;

  const alternate = fiber.alternate;
  if (alternate) {
    if ((alternate.flags & /*Deletion=*/ 8) !== 0) return true;
  }

  return false;
}

let session: Session | null = null;
export const flush = (): void => {
  console.log('flush call');

  const monitor = Store.monitor.value;
  if (!monitor) {
    return;
  }

  if (!navigator.onLine) return;

  if (!monitor.url) {
    return;
  }
  if (!monitor.interactions.length) {
    console.log('no interactions');

    return;
  }
  if (!session) {
    session = getSession();
  }

  if (!session) return;

  const aggregatedComponents: Array<{
    interactionId: string; // grouping components by interaction
    name: string;
    renders: number; // how many times it re-rendered / instances (normalized)
    instances: number; // instances which will be used to get number of total renders by * by renders
    totalTime?: number;
    selfTime?: number;
  }> = [];
  // let comp
  const copiedInteractions = [...monitor.interactions]; // copy the interactions so we can retry with this set of interactions later
  for (const interaction of monitor.interactions) {
    for (const [name, component] of interaction.components.entries()) {
      aggregatedComponents.push({
        name,
        instances: component.fibers.size,
        interactionId: interaction.performanceEntry.id,
        renders: component.renders,
        totalTime: component.totalTime,
      });
      // @ts-expect-error
      interaction.renders = component.fibers.size;

      if (component.retiresAllowed === 0) {
        // otherwise there will be a memory leak if the user loses internet or our server goes down
        // we decide to skip the collection if this is the case
        interaction.components.delete(name);
      }

      component.retiresAllowed -= 1;
    }
  }

  // onents: Array <
  // console.log('we have', monitor);

  //
  const payload: IngestRequest = {
    route: monitor.route,
    path: monitor.path,
    interactions: monitor.interactions.map(
      (interaction) =>
        ({
          componentName: interaction.componentName,
          componentPath: interaction.componentPath,
          id: interaction.performanceEntry.id,
          latency: interaction.performanceEntry.latency,
          type: interaction.performanceEntry.type,
          startTime: interaction.performanceEntry.startTime,
          processingStart: interaction.performanceEntry.processingStart,
          processingEnd: interaction.performanceEntry.processingEnd,
          duration: interaction.performanceEntry.duration,
          inputDelay: interaction.performanceEntry.inputDelay,
          processingDuration: interaction.performanceEntry.processingDuration,
          presentationDelay: interaction.performanceEntry.presentationDelay,

          // performanceEntry: interaction.performanceEntry,
        }) satisfies Omit<
          ScanInteraction,
          'components' | 'performanceEntry'
        > & {
          // this is so bad, but for the sake of time
          id: string;
          latency: number;
          type: 'pointer' | 'keyboard' | null;
          startTime: number;
          processingStart: number;
          processingEnd: number;
          duration: number;
          inputDelay: number;
          processingDuration: number;
          presentationDelay: number;
        },
    ),
    components: aggregatedComponents,
    session,
  };

  console.log('attempting to flush', payload);

  // const components = monitor.components;
  monitor.pendingRequests++;

  try {
    transport(monitor.url, payload)
      .then(() => {
        monitor.pendingRequests--;
      })
      .catch(async () => {
        // for (interaction of monitor.interactions) {

        // }
        monitor.interactions = monitor.interactions.concat(copiedInteractions); // the cleared interactions need to be added back
        // monitor.components = monitor.components.concat(aggregatedComponents);
        await transport(monitor.url!, payload).catch(() => null);
      });
  } catch {
    /* */
  }
  // why is this a timeout? Someone document or remove
  setTimeout(() => {
    monitor.interactions = [];
  }, 0);
  // Store.mo
  // setTimeout(() => {
  //   const monitor = Store.monitor.value;
  //   if (monitor) {
  //     monitor.components = [];
  //   }
  // }, 0);
};

export const debouncedFlush = debounce(flush, 5000);
const CONTENT_TYPE = 'application/json';
const supportsCompression = typeof CompressionStream === 'function';

export const compress = async (payload: string): Promise<ArrayBuffer> => {
  const stream = new Blob([payload], { type: CONTENT_TYPE })
    .stream()
    .pipeThrough(new CompressionStream('gzip'));
  return new Response(stream).arrayBuffer();
};

/**
 * Modified from @palette.dev/browser:
 *
 * @see https://gist.github.com/aidenybai/473689493f2d5d01bbc52e2da5950b45#file-palette-dev-browser-dist-palette-dev-mjs-L365
 */
export const transport = async (
  url: string,
  payload: IngestRequest,
): Promise<{ ok: boolean }> => {
  const fail = { ok: false };
  /**
   * JSON.stringify replacer function is ~60-80% slower than JSON.stringify
   *
   * Perflink: https://dub.sh/json-replacer-fn
   */
  const json = JSON.stringify(payload, (key, value) => {
    // Truncate floats to 5 decimal places (long floats cause error in ClickHouse)
    if (
      typeof value === 'number' &&
      parseInt(value as any) !== value /* float check */
    ) {
      value = ~~(value * FLOAT_MAX_LEN) / FLOAT_MAX_LEN;
    }
    // Remove falsy (e.g. undefined, null, []), and keys starting with "_"
    // to reduce the size of the payload
    if (
      // eslint-disable-next-line eqeqeq
      (value != null && value !== false) ||
      (Array.isArray(value) && value.length)
    ) {
      return value;
    }
  });
  // gzip may not be worth it for small payloads,
  // only use it if the payload is large enough
  const shouldCompress = json.length > GZIP_MIN_LEN;
  const body =
    shouldCompress && supportsCompression ? await compress(json) : json;

  if (!navigator.onLine) return fail;
  const headers: any = {
    'Content-Type': CONTENT_TYPE,
    'Content-Encoding': shouldCompress ? 'gzip' : undefined,
    'x-api-key': Store.monitor.value?.apiKey,
  };
  if (shouldCompress) url += '?z=1';
  const size = typeof body === 'string' ? body.length : body.byteLength;
  return fetch(url, {
    body,
    method: 'POST',
    referrerPolicy: 'origin',
    /**
     * Outgoing requests are usually cancelled when navigating to a different page, causing a "TypeError: Failed to
     * fetch" error and sending a "network_error" client-outcome - in Chrome, the request status shows "(cancelled)".
     * The `keepalive` flag keeps outgoing requests alive, even when switching pages. We want this since we're
     * frequently sending events right before the user is switching pages (e.g., when finishing navigation transactions).
     *
     * This is the modern alternative to the navigator.sendBeacon API.
     * @see https://javascript.info/fetch-api#keepalive
     *
     * Gotchas:
     * - `keepalive` isn't supported by Firefox
     * - As per spec (https://fetch.spec.whatwg.org/#http-network-or-cache-fetch):
     *   If the sum of contentLength and inflightKeepaliveBytes is greater than 64 kibibytes, then return a network error.
     *   We will therefore only activate the flag when we're below that limit.
     * - There is also a limit of requests that can be open at the same time, so we also limit this to 15.
     *
     * @see https://github.com/getsentry/sentry-javascript/pull/7553
     */
    keepalive:
      GZIP_MAX_LEN > size &&
      MAX_PENDING_REQUESTS > (Store.monitor.value?.pendingRequests ?? 0),
    priority: 'low',
    // mode: 'no-cors',
    headers,
  });
};
