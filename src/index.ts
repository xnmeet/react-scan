import { type Fiber, type FiberRoot } from 'react-reconciler';
import { type ComponentType } from 'react';
import {
  createFullscreenCanvas,
  flushOutlines,
  getOutline,
  getPendingOutlines,
  MONO_FONT,
  setPendingOutlines,
} from './outline';
import { traverseFiber, registerDevtoolsHook, getType } from './fiber';
import type { Outline, ScanOptions, UseScanOptions } from './types';

const DEFAULT_OPTIONS: ScanOptions & UseScanOptions = {
  enabled: true,
  includeChildren: true,
  log: true,
  clearLog: true,
};
let currentOptions: ScanOptions & UseScanOptions = DEFAULT_OPTIONS;
export const getCurrentOptions = () => currentOptions;
let allowList: Map<ComponentType<any>, UseScanOptions> | null = null;

let inited = false;

export const withScan = <T>(
  component: ComponentType<T>,
  options: ScanOptions & UseScanOptions = DEFAULT_OPTIONS,
) => {
  scan(options);
  if (!allowList) allowList = new Map();
  allowList.set(getType(component), options);
  return component;
};

export const scan = (
  options: ScanOptions & UseScanOptions = DEFAULT_OPTIONS,
) => {
  currentOptions = options ?? currentOptions;

  if (inited) return;
  inited = true;

  // eslint-disable-next-line no-console
  console.log(
    '%cTry Million Lint to automatically optimize your app: https://million.dev',
    `font-weight:bold;font-size:14px;font-weight:bold;font-family:${MONO_FONT}`,
  );

  const ctx = createFullscreenCanvas();

  const handleCommitFiberRoot = (_rendererID: number, root: FiberRoot) => {
    const outlines: Outline[] = [];

    const handleFiber = (fiber: Fiber) => {
      const outline = getOutline(fiber);
      if (!outline) return null;
      const shouldScan =
        allowList?.has(fiber.type) ?? allowList?.has(fiber.elementType);

      if (allowList) {
        const parent = traverseFiber(
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
      for (const fiber of root.memoizedUpdaters) {
        const outline = handleFiber(fiber);
        if (outline) outline.trigger = true;
      }
    }

    traverseFiber(root.current, (fiber) => {
      handleFiber(fiber);
    });

    const nextPendingOutlines = setPendingOutlines([
      ...getPendingOutlines(),
      ...outlines,
    ]);

    if (nextPendingOutlines.length && ctx) {
      flushOutlines(ctx);
    }
  };

  registerDevtoolsHook({
    onCommitFiberRoot(_rendererID: number, root: FiberRoot) {
      try {
        handleCommitFiberRoot(_rendererID, root);
      } catch (err) {
        // console.error(err);
      }
    },
  });
};
