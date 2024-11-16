import { type Fiber, type FiberRoot } from 'react-reconciler';
import { type ComponentType } from 'react';
import {
  createFullscreenCanvas,
  createStatus,
  flushOutlines,
  getOutline,
  getPendingOutlines,
  setPendingOutlines,
} from './overlay';
import { MONO_FONT } from './constants';
import {
  traverseFiberUntil,
  registerDevtoolsHook,
  getType,
  traverseFiber,
  getFiberRenderInfo,
} from './fiber';
import type { Outline, ScanOptions, WithScanOptions } from './types';
import { isInIframe, isProd } from './utils';

const DEFAULT_OPTIONS: ScanOptions & WithScanOptions = {
  enabled: true,
  includeChildren: true,
  log: false,
  clearLog: false,
  production: false,
};
let currentOptions: ScanOptions & WithScanOptions = DEFAULT_OPTIONS;
export const getCurrentOptions = () => currentOptions;
let allowList: Map<ComponentType<any>, WithScanOptions> | null = null;
const trackedFibers = new WeakMap<Fiber, number | undefined>();

let inited = false;

export const withScan = <T>(
  component: ComponentType<T>,
  options: ScanOptions & WithScanOptions = DEFAULT_OPTIONS,
) => {
  options.log ??= true;
  scan(options);
  if (!allowList) allowList = new Map();
  allowList.set(getType(component), options);
  return component;
};

let onCommitFiberRoot = (_rendererID: number, _root: FiberRoot): void => {
  /**/
};

if (typeof window !== 'undefined') {
  registerDevtoolsHook({
    onCommitFiberRoot: (rendererID, root) => {
      onCommitFiberRoot(rendererID, root);
    },
  });
}

const SKIP_SUBTREE = 'SKIP_SUBTREE';

export const scan = (
  options: ScanOptions & WithScanOptions = DEFAULT_OPTIONS,
) => {
  currentOptions = options ?? currentOptions;

  if (!currentOptions.production && isProd()) {
    return;
  }
  if (inited || isInIframe() || currentOptions.enabled === false) {
    return;
  }
  inited = true;

  // eslint-disable-next-line no-console
  console.log(
    '%cTry Million Lint to automatically optimize your app: https://million.dev',
    `font-weight:bold;font-size:14px;font-weight:bold;font-family:${MONO_FONT}`,
  );

  const ctx = createFullscreenCanvas();
  const status = createStatus();

  const handleCommitFiberRoot = (_rendererID: number, root: FiberRoot) => {
    const outlines: Outline[] = [];
    let totalSelfTime = 0;
    let totalCount = 0;

    const handleFiber = (fiber: Fiber) => {
      // console.log('pre-fiber');
      const renderInfo = getFiberRenderInfo(fiber);
      if (!fiber || !renderInfo.didRender) {
        return renderInfo.type === 'memo' ? SKIP_SUBTREE : null;
      }
      // console.log('post-fiber');

      const outline = getOutline(fiber);
      // console.log('outline', outline);
      if (!outline) return null;
      if (trackedFibers.has(fiber)) {
        const startTime = trackedFibers.get(fiber);
        if (
          // eslint-disable-next-line eqeqeq
          startTime != null &&
          // eslint-disable-next-line eqeqeq
          fiber.actualStartTime != null &&
          startTime > fiber.actualStartTime
        ) {
          return null;
        }
      }
      trackedFibers.set(fiber, fiber.actualStartTime);
      const shouldScan =
        allowList?.has(fiber.type) ?? allowList?.has(fiber.elementType);

      if (allowList) {
        const parent = traverseFiberUntil(
          fiber,
          (node) => {
            const options =
              allowList?.get(node.type) ?? allowList?.get(node.elementType);
            return options?.includeChildren;
          },
          true,
        );
        if (!parent && !shouldScan) return null;
      }
      outlines.push(outline);
      return outline;
    };

    if (root.memoizedUpdaters) {
      for (const updaterFiber of root.memoizedUpdaters) {
        const outline = handleFiber(updaterFiber);
        if (outline && outline !== SKIP_SUBTREE) {
          outline.trigger = true;
          traverseFiber(updaterFiber, (fiber) => {
            if (handleFiber(fiber) === SKIP_SUBTREE) return true;
          });
        }
      }
    }

    traverseFiber(root.current, (fiber) => {
      if (handleFiber(fiber) === SKIP_SUBTREE) return true;
    });

    const nextPendingOutlines = setPendingOutlines([
      ...getPendingOutlines(),
      ...outlines,
    ]);

    if (nextPendingOutlines.length && ctx) {
      for (let i = 0, len = nextPendingOutlines.length; i < len; i++) {
        const outline = nextPendingOutlines[i];
        totalSelfTime += outline.selfTime;
        totalCount += outline.count;
      }
      let text = `×${totalCount}`;
      if (totalSelfTime > 0) text += ` (${totalSelfTime.toFixed(2)}ms)`;
      status.textContent = `${text} · react-scan`;
      flushOutlines(ctx);
    }
  };

  onCommitFiberRoot = (_rendererID: number, root: FiberRoot) => {
    try {
      handleCommitFiberRoot(_rendererID, root);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    }
  };
  registerDevtoolsHook({
    onCommitFiberRoot: onCommitFiberRoot,
  });
};
