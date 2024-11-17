import type { Fiber, FiberRoot } from 'react-reconciler';
import * as React from 'react';
import { type NO_OP } from '../utils';
import { ReactScanInternals } from '../index';
import { getDisplayName, fastSerialize, getType } from './utils';
import {
  didFiberRender,
  getSelfTime,
  hasMemoCache,
  registerDevtoolsHook,
  traverseFiber,
} from './fiber';

declare global {
  interface Window {
    __REACT_SCAN__?: {
      ReactScanInternals: typeof ReactScanInternals;
    };
    reactScan: any;
    __REACT_DEVTOOLS_GLOBAL_HOOK__?: {
      checkDCE: typeof NO_OP;
      supportsFiber: boolean;
      renderers: Map<number, any>;
      onScheduleFiberRoot: typeof NO_OP;
      onCommitFiberRoot: (rendererID: number, root: FiberRoot) => void;
      onCommitFiberUnmount: typeof NO_OP;
      inject: (renderer: any) => number;
    };
  }
}

export interface Change {
  name: string;
  prevValue: unknown;
  nextValue: unknown;
  unstable: boolean;
}

export interface Render {
  type: 'props' | 'context';
  name: string | null;
  time: number;
  count: number;
  trigger: boolean;
  forget: boolean;
  changes: Change[] | null;
}

const unstableTypes = ['function', 'object'];

export const getPropsRender = (fiber: Fiber): Render | null => {
  const type = getType(fiber.type);
  if (!type) return null;

  const changes: Change[] = [];

  const prevProps = fiber.alternate?.memoizedProps;
  const nextProps = fiber.memoizedProps;

  for (const propName in { ...prevProps, ...nextProps }) {
    const prevValue = prevProps?.[propName];
    const nextValue = nextProps?.[propName];

    if (
      Object.is(prevValue, nextValue) ||
      React.isValidElement(prevValue) ||
      React.isValidElement(nextValue) ||
      propName === 'children'
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
    time: getSelfTime(fiber),
    forget: hasMemoCache(fiber),
  };
};

export const getContextRender = (fiber: Fiber): Render | null => {
  const type = getType(fiber.type);
  if (!type) return null;

  const nextDependencies = fiber.dependencies;
  const prevDependencies = fiber.alternate?.dependencies;

  const changes: Change[] = [];

  if (!nextDependencies || !prevDependencies) return null;
  if (
    typeof nextDependencies !== 'object' ||
    !('firstContext' in nextDependencies) ||
    typeof prevDependencies !== 'object' ||
    !('firstContext' in prevDependencies)
  ) {
    return null;
  }
  let nextContext = nextDependencies.firstContext;
  let prevContext = prevDependencies.firstContext;
  while (
    nextContext &&
    typeof nextContext === 'object' &&
    'memoizedValue' in nextContext &&
    prevContext &&
    typeof prevContext === 'object' &&
    'memoizedValue' in prevContext
  ) {
    const nextValue = nextContext.memoizedValue;
    const prevValue = prevContext.memoizedValue;

    const change: Change = {
      name: '$$context',
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

    nextContext = nextContext.next;
    prevContext = prevContext.next;
  }

  return {
    type: 'context',
    count: 1,
    trigger: false,
    changes,
    name: getDisplayName(type),
    time: getSelfTime(fiber),
    forget: hasMemoCache(fiber),
  };
};

export const instrument = ({
  onCommitStart,
  onRender,
  onCommitFinish,
}: {
  onCommitStart: () => void;
  onRender: (fiber: Fiber, render: Render) => void;
  onCommitFinish: () => void;
}) => {
  const handleCommitFiberRoot = (_rendererID: number, root: FiberRoot) => {
    if (ReactScanInternals.isPaused) return;
    onCommitStart();

    const handleFiber = (fiber: Fiber, trigger: boolean) => {
      if (!fiber || !didFiberRender(fiber)) return null;
      const propsRender = getPropsRender(fiber);
      const contextRender = getContextRender(fiber);
      if (!propsRender && !contextRender) return null;

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
        if (!parent && !shouldAllow) return null;
      }

      if (propsRender) {
        propsRender.trigger = trigger;
        onRender(fiber, propsRender);
      }
      if (contextRender) {
        contextRender.trigger = trigger;
        onRender(fiber, contextRender);
      }
    };

    if (root.memoizedUpdaters) {
      for (const fiber of root.memoizedUpdaters) {
        handleFiber(fiber, true);
      }
    }

    traverseFiber(root.current, (fiber) => {
      handleFiber(fiber, false);
    });

    onCommitFinish();
  };

  ReactScanInternals.onCommitFiberRoot = (
    rendererID: number,
    root: FiberRoot,
  ) => {
    try {
      handleCommitFiberRoot(rendererID, root);
    } catch (err) {
      /**/
    }
  };

  registerDevtoolsHook({
    onCommitFiberRoot: ReactScanInternals.onCommitFiberRoot,
  });
};
