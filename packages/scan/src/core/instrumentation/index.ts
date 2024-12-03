import type { Fiber, FiberRoot } from 'react-reconciler';
import * as React from 'react';
import { getDisplayName, fastSerialize, getType } from './utils';
import {
  didFiberRender,
  getTimings,
  hasMemoCache,
  shouldFilterFiber,
  traverseContexts,
  traverseState,
} from './fiber';
import { registerDevtoolsHook } from './init';

export interface Change {
  name: string;
  prevValue: unknown;
  nextValue: unknown;
  unstable: boolean;
}

export interface Render {
  type: 'props' | 'context' | 'state' | 'misc';
  name: string | null;
  time: number;
  count: number;
  trigger: boolean;
  forget: boolean;
  changes: Array<Change> | null;
  label?: string;
}

const unstableTypes = ['function', 'object'];

// eslint-disable-next-line @typescript-eslint/ban-types
export const getPropsRender = (fiber: Fiber, type: Function): Render | null => {
  const changes: Array<Change> = [];

  const prevProps = fiber.alternate?.memoizedProps;
  const nextProps = fiber.memoizedProps;

  for (const propName in { ...prevProps, ...nextProps }) {
    const prevValue = prevProps?.[propName];
    const nextValue = nextProps?.[propName];

    if (
      Object.is(prevValue, nextValue) ||
      React.isValidElement(prevValue) ||
      React.isValidElement(nextValue)
    ) {
      continue;
    }
    const change: Change = {
      name: propName,
      prevValue,
      nextValue,
      unstable: false,
    };
    changes.push(change);

    const prevValueString = fastSerialize(prevValue);
    const nextValueString = fastSerialize(nextValue);

    if (
      !unstableTypes.includes(typeof prevValue) ||
      !unstableTypes.includes(typeof nextValue) ||
      prevValueString !== nextValueString
    ) {
      continue;
    }

    change.unstable = true;
  }

  return {
    type: 'props',
    count: 1,
    trigger: false,
    changes,
    name: getDisplayName(type),
    time: getTimings(fiber),
    forget: hasMemoCache(fiber),
  };
};

export const getContextRender = (
  fiber: Fiber,
  // eslint-disable-next-line @typescript-eslint/ban-types
  type: Function,
): Render | null => {
  const changes: Array<Change> = [];

  const result = traverseContexts(fiber, (prevContext, nextContext) => {
    const prevValue = prevContext.memoizedValue;
    const nextValue = nextContext.memoizedValue;

    const change: Change = {
      name: '',
      prevValue,
      nextValue,
      unstable: false,
    };
    changes.push(change);

    const prevValueString = fastSerialize(prevValue);
    const nextValueString = fastSerialize(nextValue);

    if (
      unstableTypes.includes(typeof prevValue) &&
      unstableTypes.includes(typeof nextValue) &&
      prevValueString === nextValueString
    ) {
      change.unstable = true;
    }
  });

  if (!result) return null;

  return {
    type: 'context',
    count: 1,
    trigger: false,
    changes,
    name: getDisplayName(type),
    time: getTimings(fiber),
    forget: hasMemoCache(fiber),
  };
};

export const instrument = ({
  onCommitStart,
  isValidFiber,
  onRender,
  onCommitFinish,
}: {
  onCommitStart: () => void;
  isValidFiber: (fiber: Fiber) => boolean;
  onRender: (fiber: Fiber, renders: Array<Render>) => void;
  onCommitFinish: () => void;
}) => {
  const instrumentation = {
    isPaused: false,
    fiberRoots: new Set<FiberRoot>(),
    onCommitFiberRoot: (_rendererID: number, _root: FiberRoot) => {
      /**/
    },
  };
  const handleCommitFiberRoot = (_rendererID: number, root: FiberRoot) => {
    if (instrumentation.isPaused) return;
    onCommitStart();
    const recordRender = (fiber: Fiber) => {
      const type = getType(fiber.type);
      if (!type) return null;
      if (!didFiberRender(fiber) || !isValidFiber(fiber)) return null;

      const propsRender = getPropsRender(fiber, type);
      const contextRender = getContextRender(fiber, type);

      let trigger = false;
      if (fiber.alternate) {
        const didStateChange = traverseState(fiber, (prevState, nextState) => {
          return !Object.is(prevState.memoizedState, nextState.memoizedState);
        });
        if (didStateChange) {
          trigger = true;
        }
      }
      const name = getDisplayName(type);
      if (name === 'Million(Profiler)') return;

      if (!propsRender && !contextRender) return null;

      const renders: Array<Render> = [];
      if (propsRender) {
        propsRender.trigger = trigger;
        renders.push(propsRender);
      }
      if (contextRender) {
        contextRender.trigger = trigger;
        renders.push(contextRender);
      }
      if (trigger) {
        renders.push({
          type: 'state',
          count: 1,
          trigger,
          changes: [],
          name: getDisplayName(type),
          time: getTimings(fiber),
          forget: hasMemoCache(fiber),
        });
      }
      if (!propsRender && !contextRender && !trigger) {
        renders.push({
          type: 'misc',
          count: 1,
          trigger,
          changes: [],
          name: getDisplayName(type),
          time: getTimings(fiber),
          forget: hasMemoCache(fiber),
        });
      }
      onRender(fiber, renders);
    };

    const rootFiber = root.current;
    const wasMounted =
      rootFiber.alternate !== null &&
      Boolean(rootFiber.alternate.memoizedState?.element) &&
      // A dehydrated root is not considered mounted
      rootFiber.alternate.memoizedState.isDehydrated !== true;
    const isMounted = Boolean(rootFiber.memoizedState?.element);

    const mountFiber = (firstChild: Fiber, traverseSiblings: boolean) => {
      let fiber: Fiber | null = firstChild;

      // eslint-disable-next-line eqeqeq
      while (fiber != null) {
        const shouldIncludeInTree = !shouldFilterFiber(fiber);
        if (shouldIncludeInTree) {
          recordRender(fiber);
        }

        // eslint-disable-next-line eqeqeq
        if (fiber.child != null) {
          mountFiber(fiber.child, true);
        }
        fiber = traverseSiblings ? fiber.sibling : null;
      }
    };

    const updateFiber = (nextFiber: Fiber, prevFiber: Fiber) => {
      if (!prevFiber) return;

      const shouldIncludeInTree = !shouldFilterFiber(nextFiber);
      if (shouldIncludeInTree) {
        recordRender(nextFiber);
      }

      if (nextFiber.child !== prevFiber.child) {
        let nextChild = nextFiber.child;

        while (nextChild) {
          const prevChild = nextChild.alternate;
          if (prevChild) {
            updateFiber(nextChild, prevChild);
          } else {
            mountFiber(nextChild, false);
          }

          nextChild = nextChild.sibling;
        }
      }
    };

    if (!wasMounted && isMounted) {
      mountFiber(rootFiber, false);
    } else if (wasMounted && isMounted) {
      updateFiber(rootFiber, rootFiber.alternate);
    }

    onCommitFinish();
  };

  const onCommitFiberRoot = (rendererID: number, root: FiberRoot) => {
    if (root) {
      instrumentation.fiberRoots.add(root);
    }

    try {
      handleCommitFiberRoot(rendererID, root);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[React Scan] Error instrumenting: ', err);
    }
  };

  registerDevtoolsHook({ onCommitFiberRoot });

  instrumentation.onCommitFiberRoot = onCommitFiberRoot;

  return instrumentation;
};
