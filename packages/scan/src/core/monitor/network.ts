import React from 'react';
import { ReactScanInternals } from '../..';
import {
  FLOAT_MAX_LEN,
  GZIP_MIN_LEN,
  GZIP_MAX_LEN,
  MAX_PENDING_REQUESTS,
} from './constants';
import { debounce, getSession, type Session } from './utils';

interface Payload {
  session: Session;
  data: unknown;
  react: string | null;
  date: number;
}

let session: Session | null = null;
export const flush = (): void => {
  if (!ReactScanInternals.monitor) {
    throw new Error(
      'Invariant: Monitoring object must be not null when flushing',
    );
  }
  if (!ReactScanInternals.monitor.url) {
    throw new Error('Invariant: URL must be defined when flushing');
  }
  const derefMonitor = ReactScanInternals.monitor;
  const derefUrl = ReactScanInternals.monitor.url;
  if (!navigator.onLine) return;

  const nothingToFlush = ReactScanInternals.monitor.batch.length === 0; // determine later
  if (nothingToFlush) {
    return;
  }
  if (!session) {
    session = getSession();
  }
  const date = Date.now();

  // we copy the batch incase we have to retry (we clear the batch immediately/optimistically)
  const payload: Payload = {
    data: readStatsFromIndexDB(),
    session: session!,
    react: React.version || null,
    date,
  };

  const batch = ReactScanInternals.monitor.batch;
  ReactScanInternals.monitor.pendingRequests++;

  try {
    transport(derefUrl, payload)
      // we do this because react-dev-overlay (also next) will catch
      // a TypeError: Failed to fetch (CORS error) and crash the app in development
      .then(() => {
        derefMonitor.pendingRequests--;
      })
      .catch(async () => {
        derefMonitor.batch = derefMonitor.batch.concat(batch);

        // todo: exponential backoff
        await transport(derefUrl, payload);
      });
  } catch {
    /* */
  }
  setTimeout(reset, 0);
};

export const debouncedFlush = debounce(flush, 5000);
const CONTENT_TYPE = 'application/json';
const supportsCompression = typeof CompressionStream === 'function';

/**
 * Modified from @palette.dev/browser:
 *
 * @see https://gist.github.com/aidenybai/473689493f2d5d01bbc52e2da5950b45#file-palette-dev-browser-dist-palette-dev-mjs-L357
 */
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
  payload: Payload,
): Promise<{ ok: boolean }> => {
  if (!ReactScanInternals.monitor) {
    throw new Error(
      'Invariant: Monitoring object must be not null when transporting',
    );
  }
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
      (value != null &&
        value !== false &&
        // eslint-disable-next-line @typescript-eslint/prefer-string-starts-ends-with
        key[0] !== '_') ||
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
      MAX_PENDING_REQUESTS > ReactScanInternals.monitor.pendingRequests,
    priority: 'low',
    mode:
      /* proxySessionId || */ process.env.NODE_ENV === 'production'
        ? undefined
        : 'no-cors',
    headers,
  });
};
const readStatsFromIndexDB = () => {
  /* TODO*/
  return null!;
};

const clearStatsFromIndexDB = () => {
  /* TODO*/
  return;
};

const reset = () => {
  clearStatsFromIndexDB();
};
