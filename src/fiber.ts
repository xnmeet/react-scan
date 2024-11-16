import type { Fiber, FiberRoot } from 'react-reconciler';
import { NO_OP } from './utils';
import type { Renderer } from './types';

const PerformedWorkFlag = 0b01;
const ClassComponentTag = 1;
const FunctionComponentTag = 0;
const ContextConsumerTag = 9;
const ForwardRefTag = 11;
const MemoComponentTag = 14;
const SimpleMemoComponentTag = 15;

export const getFiberRenderInfo = (
  fiber: Fiber,
): {
  didRender: boolean;
  type: string | null;
} => {
  const prevProps = fiber.alternate?.memoizedProps || {};
  const nextProps = fiber.memoizedProps || {};
  const flags = fiber.flags ?? (fiber as any).effectTag ?? 0;
  const didPerformWork = (flags & PerformedWorkFlag) === PerformedWorkFlag;

  let type: string | null = null;
  let didRender = false;

  switch (fiber.tag) {
    case ClassComponentTag:
    case FunctionComponentTag:
    case ContextConsumerTag:
    case ForwardRefTag:
      didRender = didPerformWork;
      break;
    case MemoComponentTag:
    case SimpleMemoComponentTag:
      type = 'memo';
      if (typeof fiber.type.compare === 'function') {
        didRender = !fiber.type.compare(prevProps, nextProps);
      }
      // compare == null for normal memo(Component) / SimpleMemoComponent
      if (prevProps && typeof prevProps === 'object') {
        for (const key in { ...prevProps, ...nextProps }) {
          if (!Object.is(prevProps[key], nextProps[key])) {
            didRender = true;
            break;
          }
        }
      }
      break;
    default:
      // Host nodes (DOM, root, etc.)
      if (!fiber.alternate) {
        didRender = true;
        break;
      }
      didRender =
        prevProps !== nextProps ||
        fiber.alternate.memoizedState !== fiber.memoizedState ||
        fiber.alternate.ref !== fiber.ref;
      break;
  }

  return { didRender, type };
};

export const traverseFiber = (
  fiber: Fiber | null,
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  selector: (node: Fiber) => boolean | void,
): void => {
  if (!fiber) return;
  if (!selector(fiber)) {
    traverseFiber(fiber.child, selector);
  }
  traverseFiber(fiber.sibling, selector);
};

export const traverseFiberUntil = (
  fiber: Fiber | null,
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  selector: (node: Fiber) => boolean | void,
  ascending = false,
): Fiber | null => {
  if (!fiber) return null;
  if (selector(fiber) === true) return fiber;

  let child = ascending ? fiber.return : fiber.child;
  while (child) {
    const match = traverseFiberUntil(child, selector, ascending);
    if (match) return match;

    child = ascending ? null : child.sibling;
  }
  return null;
};

export const getType = (type: any) => {
  if (typeof type === 'function') {
    return type;
  }
  if (typeof type === 'object' && type) {
    // memo / forwardRef case
    return getType(type.type || type.render);
  }
  return null;
};

export const getDisplayName = (type: any): string | null => {
  type = getType(type);
  if (!type) return null;
  return type.displayName || type.name || null;
};

export const getTimings = (fiber?: Fiber | null | undefined) => {
  const totalTime = fiber?.actualDuration ?? 0;
  let selfTime = totalTime;
  let child = fiber?.child ?? null;
  // eslint-disable-next-line eqeqeq
  while (totalTime > 0 && child != null) {
    selfTime -= child.actualDuration ?? 0;
    child = child.sibling;
  }
  return { totalTime, selfTime };
};

export const registerDevtoolsHook = ({
  onCommitFiberRoot,
}: {
  onCommitFiberRoot: (rendererID: number, root: FiberRoot) => void;
}) => {
  let devtoolsHook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
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
      inject(renderer: Renderer) {
        const nextID = ++i;
        renderers.set(nextID, renderer);
        return nextID;
      },
    };
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = devtoolsHook;
  }

  const prevOnCommitFiberRoot = devtoolsHook.onCommitFiberRoot;
  devtoolsHook.onCommitFiberRoot = (rendererID: number, root: FiberRoot) => {
    if (prevOnCommitFiberRoot) prevOnCommitFiberRoot(rendererID, root);
    onCommitFiberRoot(rendererID, root);
  };

  // const renderersArray = Array.from(devtoolsHook.renderers.values());
  // for (let i = 0, len = renderersArray.length; i < len; i++) {
  //   const renderer = renderersArray[i];
  //   controlDispatcherRef(renderer.currentDispatcherRef);
  // }

  return devtoolsHook;
};

// TODO: check useMemo / useCallback / useMemoCache (React Compiler)

// const REACT_MAJOR_VERSION = Number(React.version.split('.')[0]);
// const dispatcherRefs = new Set();

// export const controlDispatcherRef = (currentDispatcherRef: any) => {
//   const ref = currentDispatcherRef;
//   if (ref && !dispatcherRefs.has(ref)) {
//     // Renamed to ".H" in React 19
//     const propName = REACT_MAJOR_VERSION > 18 ? 'H' : 'current';
//     let currentDispatcher = ref[propName];
//     const seenDispatchers = new Set();

//     Object.defineProperty(ref, propName, {
//       get: () => currentDispatcher,
//       set(current: any) {
//         currentDispatcher = current;

//         if (
//           !current ||
//           seenDispatchers.has(current) ||
//           current.useRef === current.useImperativeHandle ||
//           /warnInvalidContextAccess\(\)/.test(current.readContext.toString())
//         ) {
//           return;
//         }
//         seenDispatchers.add(current);
//         const isInComponent = peekIsInComponent(current);
//         if (!isInComponent) return;
//         const prevUseCallback = current.useCallback;
//         const useCallback = (fn: (...args: any[]) => any, deps: any[]) => {
//           return prevUseCallback(fn, deps);
//         };
//         current.useCallback = useCallback;

//         const prevUseMemo = current.useMemo;
//         const useMemo = (fn: (...args: any[]) => any, deps: any[]) => {
//           return prevUseMemo(fn, deps);
//         };
//         current.useMemo = useMemo;
//       },
//     });
//     dispatcherRefs.add(ref);
//   }
// };

// const invalidHookErrFunctions = new WeakMap<() => void, boolean>();

// /**
//  * Check if you can currently run hooks in a component. This avoids allocting
//  * a new hook on the stack by "peeking." Note that this doesn't correctly handle some cases
//  * For example, if you are iterating through Array.map, it won't check if you allocate more/less hooks between renders
//  *
//  * This function checks the current dispatcher, which is swapped with an invalid / valid state by React. If
//  * the current dispatcher is invalid (includes the string ("Error")), it will return false.
//  */
// export const peekIsInComponent = (
//   dispatcher: Record<string, () => void>,
// ): boolean => {
//   const hook = dispatcher.useRef;

//   if (typeof hook !== 'function' || invalidHookErrFunctions.has(hook)) {
//     return false;
//   }
//   const str = hook.toString();
//   if (str.includes('Error')) {
//     invalidHookErrFunctions.set(hook, true);
//     return false;
//   }
//   return true;
// };
