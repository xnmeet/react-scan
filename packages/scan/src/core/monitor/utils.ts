import type { Fiber } from 'react-reconciler';
import { onIdle } from '../web/utils';
import { getDisplayName } from '../instrumentation/utils';
import { isSSR } from './constants';
import { Device, type Session } from './types';
import { Store } from '..';

const getDeviceType = () => {
  const userAgent = navigator.userAgent;

  if (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      userAgent,
    )
  ) {
    return Device.MOBILE;
  } else if (/iPad|Tablet/i.test(userAgent)) {
    return Device.TABLET;
  }
  return Device.DESKTOP;
};

/**
 * Measure layout time
 */
export const doubleRAF = (callback: (...args: Array<any>) => void) => {
  return requestAnimationFrame(() => {
    requestAnimationFrame(callback);
  });
};

export const generateId = () => {
  const alphabet =
    'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict';
  let id = '';
  const randomValues = crypto.getRandomValues(new Uint8Array(21));
  for (let i = 0; i < 21; i++) {
    id += alphabet[63 & randomValues[i]];
  }
  return id;
};

/**
 * @see https://deviceandbrowserinfo.com/learning_zone/articles/webgl_renderer_values
 */
const getGpuRenderer = () => {
  // Prevent WEBGL_debug_renderer_info deprecation warnings in firefox
  if (!('chrome' in window)) return '';
  const gl = document
    .createElement('canvas')
    // Get the specs for the fastest GPU available. This helps provide a better
    // picture of the device's capabilities.
    .getContext('webgl', { powerPreference: 'high-performance' });
  if (!gl) return '';
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '';
};

/**
 * Session is a loose way to fingerprint / identify a session.
 *
 * Modified from @palette.dev/browser:
 * @see https://gist.github.com/aidenybai/473689493f2d5d01bbc52e2da5950b45#file-palette-dev-browser-dist-palette-dev-mjs-L554
 */
export const getSession = (): Session | null => {
  if (isSSR) return null;
  const id = generateId();
  const url = window.location.toString();
  /**
   * WiFi connection strength
   *
   * Potential outputs: slow-2g, 2g, 3g, 4g
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation/effectiveType
   */
  const connection = (navigator as any).connection;
  const wifi = (connection && connection.effectiveType) || null;
  /**
   * Number of CPU threads
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Navigator/hardwareConcurrency
   */
  const cpu = navigator.hardwareConcurrency;
  /**
   * Device memory (GiB)
   *
   * Potential outputs: 0.25, 0.5, 1, 2, 4, 8
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Navigator/deviceMemory
   */
  // @ts-expect-error - deviceMemory is still experimental
  const mem = navigator.deviceMemory; // GiB ram

  const session = {
    id,
    url,
    device: getDeviceType(),
    wifi,
    cpu,
    mem,
    gpu: null,
    agent: navigator.userAgent,
    route: Store.monitor.value?.route ?? null, // may not be smart to read store here, abstraction is bad at the least
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
// export const debounce = <T extends (...args: Array<any>) => any>(
//   callback: T,
//   timeout = 1000,
//   maxTimeout = 5000,
// ): ((...args: Parameters<T>) => void) => {
//   let timeoutId: ReturnType<typeof setTimeout> | undefined;
//   let startTime: number | undefined;

//   return function (this: ThisParameterType<T>) {
//     const now = Date.now();

//     if (startTime && now - startTime >= maxTimeout) {
//       // Force execution if max timeout exceeded
//       // eslint-disable-next-line prefer-rest-params
//       callback.apply(this, arguments as any);
//       timeoutId = undefined;
//       startTime = undefined;
//       return;
//     }

//     if (timeoutId !== undefined) {
//       clearTimeout(timeoutId);
//     } else {
//       startTime = now;
//     }

//     timeoutId = setTimeout(() => {
//       // eslint-disable-next-line prefer-rest-params
//       callback.apply(this, arguments as any);
//       timeoutId = undefined;
//       startTime = undefined;
//     }, timeout);
//   };
// };

export function getComponentPath(fiber: Fiber): Array<string> {
  const path: Array<string> = [];
  let current: Fiber | null = fiber;

  while (current) {
    if (current.type) {
      const name = getDisplayName(current.type);
      if (name) {
        path.unshift(name);
      }
    }
    current = current.return;
  }

  return path;
}
