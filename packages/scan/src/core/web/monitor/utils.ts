import { onIdle } from "../utils";
import { isSSR } from "./constants";

/**
 * Measure layout time
 */
export let doubleRAF = (callback: (...args: Array<any>) => void) => {
  return requestAnimationFrame(() => {
    requestAnimationFrame(callback);
  });
};



/**
 * Modified version of nanoid (prevent collisions)
 *
 * @see https://github.com/ai/nanoid/blob/main/nanoid.js
 */
export let generateId = () => {
  let alphabet =
    "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";
  let id = "";
  let randomValues = crypto.getRandomValues(new Uint8Array(21));
  for (let i = 0; i < 21; i++) {
    id += alphabet[63 & randomValues[i]];
  }
  return id;
};

/**
 * @see https://deviceandbrowserinfo.com/learning_zone/articles/webgl_renderer_values
 */
let getGpuRenderer = () => {
  // Prevent WEBGL_debug_renderer_info deprecation warnings in firefox
  if (!('chrome' in window)) return '';
  let gl = document!
    .createElement('canvas')
    // Get the specs for the fastest GPU available. This helps provide a better
    // picture of the device's capabilities.
    .getContext('webgl', { powerPreference: 'high-performance' });
  if (!gl) return '';
  let ext = gl.getExtension('WEBGL_debug_renderer_info');
  return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '';
};

export interface Session {
  id: string;
  url: string;
  wifi: string;
  cpu: number;
  gpu: string | null;
  mem: number;
}

/**
 * Session is a loose way to fingerprint / identify a session.
 *
 * Modified from @palette.dev/browser:
 * @see https://gist.github.com/aidenybai/473689493f2d5d01bbc52e2da5950b45#file-palette-dev-browser-dist-palette-dev-mjs-L554
 */
export let getSession = (): Session | null => {
  if (isSSR) return null;
  let id = generateId();
  let url = window.location.toString();
  /**
   * WiFi connection strength
   *
   * Potential outputs: slow-2g, 2g, 3g, 4g
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation/effectiveType
   */
  let connection = (navigator as any).connection;
  let wifi = (connection && connection.effectiveType) || null;
  /**
   * Number of CPU threads
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Navigator/hardwareConcurrency
   */
  let cpu = navigator.hardwareConcurrency;
  /**
   * Device memory (GiB)
   *
   * Potential outputs: 0.25, 0.5, 1, 2, 4, 8
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Navigator/deviceMemory
   */
  // @ts-expect-error - deviceMemory is still experimental
  let mem = navigator.deviceMemory; // GiB ram

  let session = {
    id,
    url,
    wifi,
    cpu,
    mem,
    gpu: null,
  };

  /**
   * `getGpuRenderer` creates a canvas element, which can increase
   * Total Blocking Time (TBT). Running it when main thread is idle allows us to avoid
   * initially blocking.
   */
  onIdle(() => {
    session.gpu = getGpuRenderer();
  });

  return session;
};



/**
 * Modified from @palette.dev/browser:
 *
 * @see https://gist.github.com/aidenybai/473689493f2d5d01bbc52e2da5950b45#file-palette-dev-browser-dist-palette-dev-mjs-L334
 */
export let debounce = <T extends (...args: Array<any>) => any>(
  callback: T,
  timeout = 1000,
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  return function (this: ThisParameterType<T>) {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      callback.apply(this, arguments as any);
      timeoutId = undefined;
    }, timeout);
  };
};
