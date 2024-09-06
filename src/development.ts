import type { Fiber, FiberRoot } from 'react-reconciler';

declare global {
  interface Window {
    __REACT_DEVTOOLS_GLOBAL_HOOK__?: {
      checkDCE: () => void;
      supportsFiber: boolean;
      renderers: Map<number, any>;
      onScheduleFiberRoot: () => void;
      onCommitFiberRoot: (rendererID: number, root: FiberRoot) => void;
      onCommitFiberUnmount: () => void;
      inject: (renderer: any) => number;
    };
  }
}

let reactDevtoolsGlobalHook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;

const noop = () => {};
const renderers = new Map();
let i = 0;
if (!reactDevtoolsGlobalHook) {
  reactDevtoolsGlobalHook = {
    checkDCE: noop,
    supportsFiber: true,
    renderers,
    onScheduleFiberRoot: noop,
    onCommitFiberRoot: noop,
    onCommitFiberUnmount: noop,
    inject(renderer: any) {
      let nextID = ++i;
      renderers.set(nextID, renderer);
      return nextID;
    },
  };
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = reactDevtoolsGlobalHook;
}

export const traverseFiber = (
  fiber: Fiber | null,
  selector: (node: Fiber) => boolean | void
): Fiber | null => {
  if (!fiber) return null;
  if (selector(fiber) === true) return fiber;

  let child = fiber.child;
  while (child) {
    const match = traverseFiber(child, selector);
    if (match) return match;
    child = child.sibling;
  }
  return null;
};

const PerformedWork = 0b01;

export const didFiberRender = (fiber: Fiber | null): boolean => {
  if (!fiber) return true; // mount (probably)
  const { alternate } = fiber;
  const prevProps = alternate?.memoizedProps;
  const nextProps = fiber.memoizedProps;
  switch (fiber.tag) {
    case 1: // ClassComponent
      let reactComponentProto = fiber.type.prototype;
      let sCU = reactComponentProto?.shouldComponentUpdate;
      if (typeof sCU === 'function') {
        return !sCU(alternate?.memoizedState, fiber.memoizedState);
      }
    case 0: // FunctionComponent
    case 9: // ContextConsumer
    case 11: // ForwardRef
      const flags =
        (fiber.flags !== undefined ? fiber.flags : (fiber as any).effectTag) ??
        0;
      return (flags & PerformedWork) === PerformedWork;
    case 14: // MemoComponent
    case 15: // SimpleMemoComponent
      if (fiber.type.compare) {
        // memo(Component, (p, n) => ...) / MemoComponent
        return !fiber.type.compare(prevProps, nextProps);
      }
      // compare == null for normal memo(Component) / SimpleMemoComponent
      for (const key in prevProps) {
        if (!Object.is(prevProps[key], nextProps[key])) {
          return true;
        }
      }
      return false;
    default:
      // host components (DOM, root, etc.)
      if (!alternate) return true;
      return (
        prevProps !== nextProps ||
        alternate.memoizedState !== fiber.memoizedState ||
        alternate.ref !== fiber.ref
      );
  }
};

if (reactDevtoolsGlobalHook) {
  const prevOFCR = reactDevtoolsGlobalHook?.onCommitFiberRoot;
  console.log('pog1', prevOFCR);
  // reactDevtoolsGlobalHook.onPostCommitFiberRoot = (
  //   rendererID: number,
  //   root: FiberRoot
  // ) => {
  //   if (prevOPCFU) prevOPCFU(rendererID, root);
  //   requestAnimationFrame(() => {
  //     ctx.clearRect(0, 0, canvas.width, canvas.height);
  //   });
  //   console.log('pog2');
  // };
  reactDevtoolsGlobalHook.onCommitFiberRoot = (
    rendererID: number,
    root: FiberRoot
  ) => {
    if (prevOFCR) prevOFCR(rendererID, root);
    console.log('pog');

    const rectangles: {
      rect: DOMRect;
      text: string;
      totalTime: number;
    }[] = [];

    traverseFiber(root.current, (fiber) => {
      if (
        (typeof fiber.type === 'function' || typeof fiber.type === 'object') &&
        didFiberRender(fiber)
      ) {
        let domFiber = traverseFiber(
          fiber,
          (node) => typeof node.type === 'string'
        );
        const usesReactCompiler = (fiber.updateQueue as any)?.memoCache;
        // console.log('hi', domFiber, usesReactCompiler);

        if (domFiber && domFiber.stateNode instanceof HTMLElement) {
          const rect = domFiber.stateNode.getBoundingClientRect();
          const visible =
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= window.innerHeight &&
            rect.right <= window.innerWidth;
          if (visible) {
            rectangles.push({
              rect,
              text: fiber.type.name,
              totalTime: fiber.actualDuration,
            });
          }
        }
      }
    });

    ctx.strokeStyle = '#8873ea';
    ctx.lineWidth = 1;

    rectangles.forEach(({ rect, text, totalTime }) => {
      let opacity = 1;
      const fadeOut = () => {
        ctx.clearRect(
          rect.left - 1,
          rect.top - 1,
          rect.width + 2,
          rect.height + 2
        ); // clear with a margin to avoid artifacts
        ctx.globalAlpha = opacity;
        ctx.strokeRect(rect.left, rect.top, rect.width, rect.height);

        // Add text at the top left corner of each rectangle
        ctx.font = '10px monospace';
        ctx.fillStyle = '#8873ea';
        ctx.fillText(
          `${text} ${totalTime ? `(${totalTime.toFixed(2)}ms)` : ''}`,
          rect.left,
          rect.top + 13
        ); // Position the text inside the rectangle
        // make rectangle behind the text:
        opacity -= 0.1; // reduce opacity over time
        if (opacity > 0) {
          requestAnimationFrame(fadeOut); // use requestAnimationFrame for smoother animation
        } else {
          ctx.globalAlpha = 1; // reset globalAlpha to default
          ctx.clearRect(rect.left, rect.top - 15, rect.width, rect.height + 15); // clear with a margin to avoid artifacts
        }
      };
      fadeOut();
    });
  };
}

// Create and style the canvas
const template = document.createElement('template');
template.innerHTML = `<canvas style="position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483647" aria-hidden="true"/>`;
const canvas = template.content.firstChild as HTMLCanvasElement;
document.body.appendChild(canvas);
export const ctx = canvas.getContext('2d');

// Function to resize the canvas
const resizeCanvas = () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
};

// Initial canvas size
resizeCanvas();

// Update canvas size on window resize
window.addEventListener('resize', resizeCanvas);

export {};
