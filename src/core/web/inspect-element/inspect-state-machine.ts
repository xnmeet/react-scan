import { Fiber } from 'react-reconciler';
import { Internals, ReactScanInternals } from '../../index';
import { getRect } from '../outline';

import { throttle } from '../utils';
import { renderPropsAndState } from './view-state';
import {
  currentLockIconRect,
  drawHoverOverlay,
  OVERLAY_DPR,
  updateCanvasSize,
} from './overlay';
import {
  getNearestFiberFromElement,
  isCurrentTree,
  getFirstStateNode,
  getParentCompositeFiber,
} from './utils';

export type States =
  | {
      kind: 'inspecting';
      hoveredDomElement: HTMLElement | null;
      propContainer: HTMLDivElement;
    }
  | {
      kind: 'inspect-off';
      propContainer: HTMLDivElement;
    }
  | {
      kind: 'focused';
      focusedDomElement: HTMLElement;
      propContainer: HTMLDivElement;
    }
  | {
      kind: 'uninitialized';
    };

export const INSPECT_TOGGLE_ID = 'react-scan-inspect-element-toggle';
export const INSPECT_OVERLAY_CANVAS_ID = 'react-scan-inspect-canvas';

const lastReadRenderCount = new WeakMap<Fiber, number>();

type Kinds = States['kind'];
export const createInspectElementStateMachine = () => {
  let canvas = document.getElementById(
    INSPECT_OVERLAY_CANVAS_ID,
  ) as HTMLCanvasElement | null;

  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = INSPECT_OVERLAY_CANVAS_ID;
    canvas.style.cssText = `
    position: fixed;
    left: 0;
    top: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    z-index: 214748367;
  `;
    document.documentElement.appendChild(canvas);
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) {
      return;
    }
    updateCanvasSize(canvas!, ctx);
    window.addEventListener('resize', () => {
      updateCanvasSize(canvas!, ctx);
    }); // todo add cleanup/dispose logic for createInspectElementStateMachine
  }

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) {
    // 2d context not available, just bail
    return;
  }

  const clearCanvas = () => {
    ctx.save();

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.restore();
  };
  let unsubscribeFns: Partial<{ [_ in keyof States as Kinds]: () => void }> =
    {};

  const unsubscribeAll = () => {
    Object.entries(unsubscribeFns).forEach(([unSubKey, unSub]) => {
      unSub();
    });
  };
  // let clearRectTimer: ReturnType<typeof setTimeout>;
  ReactScanInternals.subscribeMultiple(
    ['reportDataFiber', 'inspectState'],
    throttle((store: Internals) => {
      unsubscribeAll(); // potential optimization: only unSub if inspectStateKind transitioned

      const unSub = (() => {
        const inspectState = store.inspectState;
        switch (inspectState.kind) {
          case 'uninitialized': {
            return;
          }
          case 'inspect-off': {
            clearCanvas();
            // the canvas doesn't get cleared when the mouse move overlaps with the clear
            // i can't figure out why this happens, so this is an unfortunate hack
            const mouseMove = () => {
              clearCanvas();
            };
            window.addEventListener('mousemove', mouseMove);

            return () => {
              window.removeEventListener('mousemove', mouseMove);
            };
          }
          case 'inspecting': {
            inspectState.propContainer.style.maxHeight = '0';
            let currentHoveredElement: HTMLElement | null = null;
            const mouseMove = throttle((e: MouseEvent) => {
              if (!e.target) {
                return;
              }

              currentHoveredElement = e.target as HTMLElement;
              inspectState.hoveredDomElement = currentHoveredElement;
              drawHoverOverlay(
                currentHoveredElement,
                canvas,
                ctx,
                'inspecting',
              );
            }, 16); // 60fps

            window.addEventListener('mousemove', mouseMove);
            const scroll = () => {
              if (!inspectState.hoveredDomElement) {
                return;
              }

              drawHoverOverlay(
                inspectState.hoveredDomElement,
                canvas,
                ctx,
                'inspecting',
              );
            };
            window.addEventListener('scroll', scroll);
            const click = () => {
              if (!currentHoveredElement) {
                return;
              }

              drawHoverOverlay(currentHoveredElement, canvas, ctx, 'locked');
              ReactScanInternals.inspectState = {
                kind: 'focused',
                focusedDomElement: currentHoveredElement,
                propContainer: inspectState.propContainer,
              };
            };
            window.addEventListener('click', click);

            const resize = () => {
              if (!inspectState.hoveredDomElement) {
                return;
              }

              drawHoverOverlay(
                inspectState.hoveredDomElement,
                canvas,
                ctx,
                'inspecting',
              );
            };
            window.addEventListener('resize', resize);

            const keyDown = (e: KeyboardEvent) => {
              if (e.key === 'Escape') {
                ReactScanInternals.inspectState = {
                  kind: 'inspect-off',
                  propContainer: inspectState.propContainer,
                };
                // race condition that I can't figure out
                clearCanvas();
              }
            };
            window.addEventListener('keydown', keyDown);

            return () => {
              window.removeEventListener('scroll', scroll);
              window.removeEventListener('resize', resize);
              window.removeEventListener('click', click);
              window.removeEventListener('mousemove', mouseMove);
              window.removeEventListener('keydown', keyDown);
            };
          }
          case 'focused': {
            const element = inspectState.focusedDomElement;
            // todo cleanup fiber tracking logic
            const res = getNearestFiberFromElement(element);
            if (!res) return;
            const [associatedFiber] = res;
            const currentAssociatedFiber = isCurrentTree(associatedFiber)
              ? associatedFiber
              : (associatedFiber.alternate ?? associatedFiber);
            const stateNode = getFirstStateNode(currentAssociatedFiber);
            if (!stateNode) return;
            const targetRect = getRect(stateNode);
            if (!targetRect) return;
            const anotherRes = getParentCompositeFiber(currentAssociatedFiber);
            if (!anotherRes) {
              return;
            }
            let [parentCompositeFiber] = anotherRes;
            parentCompositeFiber =
              (isCurrentTree(parentCompositeFiber)
                ? parentCompositeFiber
                : parentCompositeFiber.alternate) ?? parentCompositeFiber;

            const reportDataFiber =
              store.reportDataFiber.get(parentCompositeFiber) ||
              (parentCompositeFiber.alternate
                ? store.reportDataFiber.get(parentCompositeFiber.alternate)
                : null);

            const [lastReadFiber, lastReadValue] = (() => {
              const last = lastReadRenderCount.get(parentCompositeFiber);
              if (last) {
                return [parentCompositeFiber, last];
              }

              if (!parentCompositeFiber.alternate) {
                return [null, 0];
              }

              const lastAlternate = lastReadRenderCount.get(
                parentCompositeFiber.alternate,
              );

              return [parentCompositeFiber.alternate, lastAlternate ?? 0];
            })();

            lastReadRenderCount.set(
              lastReadFiber ?? parentCompositeFiber,
              reportDataFiber?.count ?? 0,
            ); // the first set will be parentCompositeFiber

            const didRender = lastReadValue !== reportDataFiber?.count; // because we react to any change, not just this fibers change, we need this check to know if the current fiber re-rendered for this publish

            renderPropsAndState(
              didRender,
              parentCompositeFiber,
              reportDataFiber,
              inspectState.propContainer,
            );
            drawHoverOverlay(
              inspectState.focusedDomElement,
              canvas,
              ctx,
              'locked',
            );
            const keyDown = (e: KeyboardEvent) => {
              if (e.key === 'Escape') {
                clearCanvas();
                drawHoverOverlay(
                  (e.target as HTMLElement) ?? inspectState.focusedDomElement,
                  canvas,
                  ctx,
                  'inspecting',
                );
                ReactScanInternals.inspectState = {
                  kind: 'inspecting',
                  hoveredDomElement:
                    (e.target as HTMLElement) ?? inspectState.focusedDomElement,
                  propContainer: inspectState.propContainer,
                };
              }
            };
            window.addEventListener('keydown', keyDown);

            const click = (e: MouseEvent) => {
              if (!currentLockIconRect) {
                return;
              }
              const rect = canvas.getBoundingClientRect();
              const scaleX = canvas.width / rect.width;
              const scaleY = canvas.height / rect.height;
              const x = (e.clientX - rect.left) * scaleX;
              const y = (e.clientY - rect.top) * scaleY;
              const adjustedX = x / OVERLAY_DPR;
              const adjustedY = y / OVERLAY_DPR;

              if (
                adjustedX >= currentLockIconRect.x &&
                adjustedX <=
                  currentLockIconRect.x + currentLockIconRect.width &&
                adjustedY >= currentLockIconRect.y &&
                adjustedY <= currentLockIconRect.y + currentLockIconRect.height
              ) {
                inspectState.propContainer.innerHTML = '';
                inspectState.propContainer.style.maxHeight = '0';
                clearCanvas();

                drawHoverOverlay(
                  e.target as HTMLElement,
                  canvas,
                  ctx,
                  'inspecting',
                );
                e.stopPropagation();
                ReactScanInternals.inspectState = {
                  kind: 'inspecting',
                  hoveredDomElement: e.target as HTMLElement,
                  propContainer: inspectState.propContainer,
                };

                return;
              }
            };
            window.addEventListener('click', click);

            const scroll = (e: Event) => {
              drawHoverOverlay(
                inspectState.focusedDomElement,
                canvas,
                ctx,
                'locked',
              );
            };
            window.addEventListener('scroll', scroll);
            const resize = () => {
              drawHoverOverlay(
                inspectState.focusedDomElement,
                canvas,
                ctx,
                'locked',
              );
            };
            window.addEventListener('resize', resize);
            return () => {
              window.removeEventListener('scroll', scroll);
              window.removeEventListener('resize', resize);
              window.removeEventListener('keydown', keyDown);
              window.removeEventListener('click', click);
            };
          }
        }
        inspectState satisfies never;
      })();

      if (unSub) {
        unsubscribeFns[store.inspectState.kind] = unSub;
      }
    }, 16),
  );

  return () => {};
};
