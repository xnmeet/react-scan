// Note: do not import React in this file
// since it will be executed before the react devtools hook is created

import type { FiberRoot, Fiber } from 'react-reconciler';
import { NO_OP } from '../utils';

const PerformedWorkFlag = 0b01;
const ClassComponentTag = 1;
const FunctionComponentTag = 0;
const ContextConsumerTag = 9;
const ForwardRefTag = 11;
const MemoComponentTag = 14;
const SimpleMemoComponentTag = 15;
const HostComponentTag = 5;
const HostHoistableTag = 26;
const HostSingletonTag = 27;

export const registerDevtoolsHook = ({
  onCommitFiberRoot,
}: {
  onCommitFiberRoot: (rendererID: number, root: FiberRoot) => void;
}) => {
  let devtoolsHook = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  const renderers = new Map();
  let i = 0;

  if (!devtoolsHook) {
    devtoolsHook = {
      checkDCE: NO_OP,
      supportsFiber: true,
      renderers,
      onScheduleFiberRoot: NO_OP,
      onCommitFiberRoot: NO_OP,
      onCommitFiberUnmount: NO_OP,
      inject(renderer) {
        const nextID = ++i;
        renderers.set(nextID, renderer);
        return nextID;
      },
    };
    globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__ = devtoolsHook;
  }

  const prevOnCommitFiberRoot = devtoolsHook.onCommitFiberRoot;
  devtoolsHook.onCommitFiberRoot = (rendererID: number, root: FiberRoot) => {
    if (prevOnCommitFiberRoot) prevOnCommitFiberRoot(rendererID, root);
    onCommitFiberRoot(rendererID, root);
  };

  return devtoolsHook;
};

export const isHostComponent = (fiber: Fiber) =>
  fiber.tag === HostComponentTag ||
  // @ts-expect-error: it exists
  fiber.tag === HostHoistableTag ||
  // @ts-expect-error: it exists
  fiber.tag === HostSingletonTag;

const seenProps = new WeakMap<any, boolean>();

export const didFiberRender = (fiber: Fiber): boolean => {
  let nextProps = fiber.memoizedProps;
  if (!nextProps) return true;
  if (seenProps.has(nextProps)) return false;
  if (nextProps && typeof nextProps === 'object') {
    seenProps.set(nextProps, true);
  }

  nextProps ??= {};

  const prevProps = fiber.alternate?.memoizedProps || {};
  const flags = fiber.flags ?? (fiber as any).effectTag ?? 0;
  const subtreeFlags = fiber.subtreeFlags ?? 0;

  switch (fiber.tag) {
    case ClassComponentTag:
    case FunctionComponentTag:
    case ContextConsumerTag:
    case ForwardRefTag:
    case MemoComponentTag:
    case SimpleMemoComponentTag:
      return (
        (flags & PerformedWorkFlag) === PerformedWorkFlag &&
        (subtreeFlags & PerformedWorkFlag) === PerformedWorkFlag
      );
    default:
      // Host nodes (DOM, root, etc.)
      if (!fiber.alternate) return true;
      return (
        prevProps !== nextProps ||
        fiber.alternate.memoizedState !== fiber.memoizedState ||
        fiber.alternate.ref !== fiber.ref
      );
  }
};

export const getNearestHostFiber = (fiber: Fiber) => {
  let hostFiber = traverseFiber(fiber, isHostComponent);
  if (!hostFiber) {
    hostFiber = traverseFiber(fiber, isHostComponent, true);
  }
  return hostFiber;
};

export const traverseFiber = (
  fiber: Fiber | null,
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  selector: (node: Fiber) => boolean | void,
  ascending = false,
): Fiber | null => {
  if (!fiber) return null;
  if (selector(fiber) === true) return fiber;

  let child = ascending ? fiber.return : fiber.child;
  while (child) {
    const match = traverseFiber(child, selector, ascending);
    if (match) return match;

    child = ascending ? null : child.sibling;
  }
  return null;
};

export const getSelfTime = (fiber?: Fiber | null | undefined) => {
  const totalTime = fiber?.actualDuration ?? 0;
  let selfTime = totalTime;
  let child = fiber?.child ?? null;
  // eslint-disable-next-line eqeqeq
  while (totalTime > 0 && child != null) {
    selfTime -= child.actualDuration ?? 0;
    child = child.sibling;
  }
  return selfTime;
};

export const hasMemoCache = (fiber: Fiber) => {
  return Boolean((fiber.updateQueue as any)?.memoCache);
};
