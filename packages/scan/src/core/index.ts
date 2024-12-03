import type { Fiber } from 'react-reconciler';
import * as React from 'react';
import { type Signal, signal } from '@preact/signals';
import { instrument, type Render } from './instrumentation/index';
import {
  type ActiveOutline,
  flushOutlines,
  getOutline,
  type PendingOutline,
} from './web/outline';
import { logIntro } from './web/log';
import { playGeigerClickSound } from './web/geiger';
import { createPerfObserver } from './web/perf-observer';
import { initReactScanOverlay } from './web/overlay';
import {
  createInspectElementStateMachine,
  type States,
} from './web/inspect-element/inspect-state-machine';
import { createToolbar } from './web/toolbar';
import { getDisplayName, getType } from './instrumentation/utils';
import { debouncedFlush } from './monitor/network';
import { getTimings, traverseFiber } from './instrumentation/fiber';

export interface Options {
  /**
   * Enable/disable scanning
   *
   * Please use the recommended way:
   * enabled: process.env.NODE_ENV === 'development',
   *
   * @default true
   */
  enabled?: boolean;
  /**
   * Include children of a component applied with withScan
   *
   * @default true
   */
  includeChildren?: boolean;

  /**
   * Enable/disable geiger sound
   *
   * @default true
   */
  playSound?: boolean;

  /**
   * Log renders to the console
   *
   * @default false
   */
  log?: boolean;

  /**
   * Show toolbar bar
   *
   * @default true
   */
  showToolbar?: boolean;

  /**
   * Render count threshold, only show
   * when a component renders more than this
   *
   * @default 0
   */
  renderCountThreshold?: number;

  /**
   * Clear aggregated fibers after this time in milliseconds
   *
   * @default 5000
   */
  resetCountTimeout?: number;

  /**
   * Maximum number of renders for red indicator
   *
   * @default 20
   */
  maxRenders?: number;

  /**
   * Report data to getReport()
   *
   * @default false
   */
  report?: boolean;

  /**
   * Always show labels
   *
   * @default false
   */
  alwaysShowLabels?: boolean;

  /**
   * Animation speed
   *
   * @default "fast"
   */
  animationSpeed?: 'slow' | 'fast' | 'off';

  monitor?: {
    url: string;
  };

  onCommitStart?: () => void;
  onRender?: (fiber: Fiber, renders: Array<Render>) => void;
  onCommitFinish?: () => void;
  onPaintStart?: (outlines: Array<PendingOutline>) => void;
  onPaintFinish?: (outlines: Array<PendingOutline>) => void;
}

interface Event {
  componentPath: Array<string>;
  renders: Array<Render>;
}

interface Monitor {
  pendingRequests: number;
  batch: Array<Event>;
  url: string | null;
}

interface StoreType {
  isInIframe: Signal<boolean>;
  inspectState: Signal<States>;
  monitor: Signal<Monitor | null>;
  fiberRoots: WeakSet<Fiber>;
  reportData: WeakMap<Fiber, RenderData>;
  legacyReportData: Map<string, RenderData>;
  lastReportTime: Signal<number>;
}

interface RenderData {
  count: number;
  time: number;
  renders: Array<Render>;
  displayName: string | null;
  type: React.ComponentType<any> | null;
}

export interface Internals {
  instrumentation: ReturnType<typeof instrument> | null;
  componentAllowList: WeakMap<React.ComponentType<any>, Options> | null;
  options: Options;
  scheduledOutlines: Array<PendingOutline>;
  activeOutlines: Array<ActiveOutline>;
  onRender: ((fiber: Fiber, renders: Array<Render>) => void) | null;
}

export const Store: StoreType = {
  isInIframe: signal(
    typeof window !== 'undefined' && window.self !== window.top,
  ),
  inspectState: signal<States>({
    kind: 'uninitialized',
  }),
  monitor: signal<Monitor | null>(null),
  fiberRoots: new WeakSet<Fiber>(),
  reportData: new WeakMap<Fiber, RenderData>(),
  legacyReportData: new Map<string, RenderData>(),
  lastReportTime: signal(0),
};

export const ReactScanInternals: Internals = {
  instrumentation: null,
  componentAllowList: null,
  options: {
    enabled: true,
    includeChildren: true,
    playSound: false,
    log: false,
    showToolbar: true,
    renderCountThreshold: 0,
    report: undefined,
    alwaysShowLabels: false,
    animationSpeed: 'fast',
  },
  onRender: null,
  scheduledOutlines: [],
  activeOutlines: [],
};

export const getReport = (type?: React.ComponentType<any>) => {
  if (type) {
    for (const reportData of Store.legacyReportData.values()) {
      if (reportData.type === type) {
        return reportData;
      }
    }
    return null;
  }
  return Store.legacyReportData;
};

export const setOptions = (options: Options) => {
  const { instrumentation } = ReactScanInternals;
  if (instrumentation) {
    instrumentation.isPaused = !options.enabled;
  }
  ReactScanInternals.options = {
    ...ReactScanInternals.options,
    ...options,
  };
};

export const getOptions = () => ReactScanInternals.options;

export const reportRender = (fiber: Fiber, renders: Array<Render>) => {
  let reportFiber: Fiber;
  let prevRenderData: RenderData | undefined;

  const currentFiberData = Store.reportData.get(fiber);
  if (currentFiberData) {
    reportFiber = fiber;
    prevRenderData = currentFiberData;
  } else if (!fiber.alternate) {
    reportFiber = fiber;
    prevRenderData = undefined;
  } else {
    reportFiber = fiber.alternate;
    prevRenderData = Store.reportData.get(fiber.alternate);
  }

  const displayName = getDisplayName(fiber.type);

  Store.lastReportTime.value = performance.now();

  if (prevRenderData) {
    prevRenderData.renders.push(...renders);
  } else {
    const time = getTimings(fiber);

    const reportData = {
      count: renders.length,
      time,
      renders,
      displayName,
      type: null,
    };

    Store.reportData.set(reportFiber, reportData);
  }

  if (!displayName || !ReactScanInternals.options.report) return;

  const prevLegacyRenderData = Store.legacyReportData.get(displayName);

  if (prevLegacyRenderData) {
    prevLegacyRenderData.renders.push(...renders);
  } else {
    const time = getTimings(fiber);

    const reportData = {
      count: renders.length,
      time,
      renders,
      displayName: null,
      type: getType(fiber.type) || fiber.type,
    };

    Store.legacyReportData.set(displayName, reportData);
  }
};

export const start = () => {
  if (typeof window === 'undefined') {
    return;
  }

  if (document.querySelector('react-scan-overlay')) return;
  initReactScanOverlay();

  const overlayElement = document.createElement('react-scan-overlay') as any;
  document.documentElement.appendChild(overlayElement);

  const options = ReactScanInternals.options;
  if (options.showToolbar) {
    createToolbar();
  }
  const ctx = overlayElement.getContext();
  createInspectElementStateMachine();

  const audioContext =
    typeof window !== 'undefined'
      ? new (window.AudioContext ||
          // @ts-expect-error -- This is a fallback for Safari
          window.webkitAudioContext)()
      : null;
  createPerfObserver();

  logIntro();

  globalThis.__REACT_SCAN__ = {
    ReactScanInternals,
  };

  // TODO: dynamic enable, and inspect-off check
  const instrumentation = instrument({
    onCommitStart() {
      ReactScanInternals.options.onCommitStart?.();
    },
    isValidFiber(fiber) {
      const allowList = ReactScanInternals.componentAllowList;
      const shouldAllow =
        allowList?.has(fiber.type) ?? allowList?.has(fiber.elementType);

      if (shouldAllow) {
        const parent = traverseFiber(
          fiber,
          (node) => {
            const options =
              allowList?.get(node.type) ?? allowList?.get(node.elementType);
            return options?.includeChildren;
          },
          true,
        );
        if (!parent && !shouldAllow) return false;
      }
      return true;
    },
    onRender(fiber, renders) {
      if (ReactScanInternals.instrumentation?.isPaused) {
        // don't draw if it's paused
        return;
      }
      ReactScanInternals.options.onRender?.(fiber, renders);

      const type = getType(fiber.type) || fiber.type;
      if (type && typeof type === 'function' && typeof type === 'object') {
        const renderData = (type.renderData || {
          count: 0,
          time: 0,
          renders: [],
        }) as RenderData;
        const firstRender = renders[0];
        renderData.count += firstRender.count;
        renderData.time += firstRender.time;
        renderData.renders.push(firstRender);
        type.renderData = renderData;
      }

      for (let i = 0, len = renders.length; i < len; i++) {
        const render = renders[i];
        const outline = getOutline(fiber, render);
        if (!outline) return;
        ReactScanInternals.scheduledOutlines.push(outline);

        if (ReactScanInternals.options.playSound && audioContext) {
          const renderTimeThreshold = 10;
          const amplitude = Math.min(
            1,
            (render.time - renderTimeThreshold) / (renderTimeThreshold * 2),
          );
          playGeigerClickSound(audioContext, amplitude);
        }
      }
      flushOutlines(ctx, new Map());
      debouncedFlush();
    },
    onCommitFinish() {
      ReactScanInternals.options.onCommitFinish?.();
    },
  });

  ReactScanInternals.instrumentation = instrumentation;
};

export const withScan = <T>(
  component: React.ComponentType<T>,
  options: Options = {},
) => {
  setOptions(options);
  const isInIframe = Store.isInIframe.value;
  const componentAllowList = ReactScanInternals.componentAllowList;
  if (isInIframe || options.enabled === false) return component;
  if (!componentAllowList) {
    ReactScanInternals.componentAllowList = new WeakMap<
      React.ComponentType<any>,
      Options
    >();
  }
  if (componentAllowList) {
    componentAllowList.set(component, { ...options });
  }

  start();

  return component;
};

export const scan = (options: Options = {}) => {
  setOptions(options);
  const isInIframe = Store.isInIframe.value;
  if (isInIframe || options.enabled === false) return;

  start();
};

export const useScan = (options: Options) => {
  React.useEffect(() => {
    scan(options);
  }, []);
};

export const Monitor = ({ url }: { url: string }) => {
  Store.monitor.value = {
    batch: [],
    pendingRequests: 0,
    url,
  };
  return;
};

export const onRender = (
  type: unknown,
  _onRender: (fiber: Fiber, renders: Array<Render>) => void,
) => {
  const prevOnRender = ReactScanInternals.onRender;
  ReactScanInternals.onRender = (fiber, renders) => {
    prevOnRender?.(fiber, renders);
    if (getType(fiber.type) === type) {
      _onRender(fiber, renders);
    }
  };
};
