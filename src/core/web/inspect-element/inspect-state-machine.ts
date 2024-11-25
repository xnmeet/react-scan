import { Fiber } from 'react-reconciler';
import { Internals, ReactScanInternals } from '../../index';

import { throttle } from '../utils';
import { renderPropsAndState } from './view-state';
import {
  currentLockIconRect,
  drawHoverOverlay,
  OVERLAY_DPR,
  updateCanvasSize,
} from './overlay';
import { getCompositeComponentFromElement } from './utils';
import { didFiberRender } from '../../instrumentation/fiber';

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
  ReactScanInternals.subscribeMultiple(
    ['reportDataByFiber', 'inspectState'],
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
              updateCanvasSize(canvas, ctx);
            };
            window.addEventListener('mousemove', mouseMove);

            return () => {
              window.removeEventListener('mousemove', mouseMove);
            };
          }
          case 'inspecting': {
            // we want to allow the user to be able to inspect clickable things
            const eventCatcher = document.createElement('div');
            eventCatcher.style.cssText = `
              position: fixed;
              left: 0;
              top: 0;
              width: 100vw;
              height: 100vh;
              z-index: ${parseInt(canvas!.style.zIndex) - 1};
              pointer-events: auto;
            `;

            canvas!.parentNode!.insertBefore(eventCatcher, canvas);
            let currentHoveredElement: HTMLElement | null = null;
            const mouseMove = throttle((e: MouseEvent) => {
              if (ReactScanInternals.inspectState.kind !== 'inspecting') {
                return;
              }

              // temp hide event catcher to get real target
              eventCatcher.style.pointerEvents = 'none';
              const el = document.elementFromPoint(
                e.clientX,
                e.clientY,
              ) as HTMLElement;
              eventCatcher.style.pointerEvents = 'auto';

              if (!el) return;

              currentHoveredElement = el;
              inspectState.hoveredDomElement = el;
              drawHoverOverlay(el, canvas, ctx, 'inspecting');
            }, 16);

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
            const click = (e: MouseEvent) => {
              e.stopPropagation();

              eventCatcher.style.pointerEvents = 'none';
              const el =
                currentHoveredElement ??
                document.elementFromPoint(e.clientX, e.clientY);
              eventCatcher.style.pointerEvents = 'auto';

              if (!el) {
                return;
              }

              drawHoverOverlay(el as HTMLElement, canvas, ctx, 'locked');

              ReactScanInternals.inspectState = {
                kind: 'focused',
                focusedDomElement: el as HTMLElement,
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
                clearCanvas();
              }
            };
            window.addEventListener('keydown', keyDown);
            let cleanup = () => {};
            if (inspectState.hoveredDomElement) {
              cleanup = trackElementPosition(
                inspectState.hoveredDomElement,
                () => {
                  drawHoverOverlay(
                    inspectState.hoveredDomElement!,
                    canvas,
                    ctx,
                    'inspecting',
                  );
                },
              );
            }

            return () => {
              window.removeEventListener('scroll', scroll);
              window.removeEventListener('resize', resize);
              window.removeEventListener('click', click);
              window.removeEventListener('mousemove', mouseMove);
              window.removeEventListener('keydown', keyDown);
              eventCatcher.parentNode?.removeChild(eventCatcher);
              cleanup();
            };
          }
          case 'focused': {
            if (!document.contains(inspectState.focusedDomElement)) {
              clearCanvas();
              ReactScanInternals.inspectState = {
                kind: 'inspecting',
                hoveredDomElement: null,
                propContainer: inspectState.propContainer,
              };
              return;
            }
            drawHoverOverlay(
              inspectState.focusedDomElement,
              canvas,
              ctx,
              'locked',
            );
            const element = inspectState.focusedDomElement;

            let { parentCompositeFiber } =
              getCompositeComponentFromElement(element);
            if (!parentCompositeFiber) {
              return;
            }

            const reportDataFiber =
              store.reportDataByFiber.get(parentCompositeFiber) ||
              (parentCompositeFiber.alternate
                ? store.reportDataByFiber.get(parentCompositeFiber.alternate)
                : null);

            const didRender = didFiberRender(parentCompositeFiber); // because we react to any change, not just this fibers change, we need this check to know if the current fiber re-rendered for this publish

            renderPropsAndState(
              didRender,
              parentCompositeFiber,
              reportDataFiber,
              inspectState.propContainer,
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

            const onClickCanvasLockIcon = (e: MouseEvent) => {
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
            window.addEventListener('click', onClickCanvasLockIcon);

            const scroll = () => {
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

            window.addEventListener('keydown', keyDown);

            const cleanup = trackElementPosition(
              inspectState.focusedDomElement,
              () => {
                drawHoverOverlay(
                  inspectState.focusedDomElement,
                  canvas,
                  ctx,
                  'locked',
                );
              },
            );

            return () => {
              cleanup();
              window.removeEventListener('scroll', scroll);
              window.removeEventListener('resize', resize);
              window.removeEventListener('keydown', keyDown);
              window.removeEventListener('click', onClickCanvasLockIcon);
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
type CleanupFunction = () => void;
type PositionCallback = (element: Element) => void;

const trackElementPosition = (
  element: Element,
  callback: PositionCallback,
): CleanupFunction => {
  const handleAnyScroll = () => {
    callback(element);
  };

  document.addEventListener('scroll', handleAnyScroll, {
    passive: true,
    capture: true, // catch all scroll events
  });

  return () => {
    document.removeEventListener('scroll', handleAnyScroll, { capture: true });
  };
};
