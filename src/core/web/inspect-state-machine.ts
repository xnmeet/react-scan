import { Fiber } from 'react-reconciler';
import { Internals, ReactScanInternals } from '../index';
import { getDisplayName } from '../instrumentation/utils';
import { getRect } from './outline';
import {
  getChangedProps,
  getChangedState,
  getFiberFromElement,
  getFirstStateNode,
  getNearestFiberFromElement,
  getParentCompositeFiber,
  getStateFromFiber,
  isCurrentTree,
} from './props';
import { throttle } from './utils';

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
    }); // todo cleanup
  }

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) {
    // i don't know the conditions this isn't available
    // i assume the browser doesn't support it
    // so it's fair to bail here
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
  let clearRectTimer: ReturnType<typeof setTimeout>;
  ReactScanInternals.subscribeMultiple(
    ['reportDataFiber', 'inspectState'],
    throttle((store: Internals) => {
      unsubscribeAll(); // potential optimization: only unSub if inspectStateKind transitioned

      const unSub = (() => {
        const inspectState = store.inspectState;
        console.log('reacting to:', inspectState.kind);
        switch (inspectState.kind) {
          case 'uninitialized': {
            return;
          }
          case 'inspect-off': {
            clearCanvas();
            // super weird behavior when someone moves mouse while canvas is being cleared
            // it doesn't clear without this
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
            // todo clean up this fiber mess
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

            const reportDataFiber = // has .count and .time
              store.reportDataFiber.get(parentCompositeFiber) ||
              (parentCompositeFiber.alternate
                ? store.reportDataFiber.get(parentCompositeFiber.alternate)
                : null);

            // todo: clean up this logic

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
            console.log(
              'last read vs current',
              lastReadValue,
              'vs',
              reportDataFiber?.count,
            );

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
            // this doesn't work since u may want to interact with ui
            // const click = (e: MouseEvent) => {
            //   drawHoverOverlay(
            //     (e.target as HTMLElement) ?? inspectState.focusedDomElement,
            //     canvas,
            //     ctx,
            //     'inspecting',
            //   );
            //   ReactScanInternals.inspectState = {
            //     kind: 'inspecting',
            //     hoveredDomElement:
            //       (e.target as HTMLElement) ?? inspectState.focusedDomElement,
            //     propContainer: inspectState.propContainer,
            //   };
            // };
            // window.addEventListener('click', click);

            const click = (e: MouseEvent) => {
              if (!currentLockIconRect) {
                return;
              }
              const rect = canvas.getBoundingClientRect();
              const scaleX = canvas.width / rect.width;
              const scaleY = canvas.height / rect.height;
              const x = (e.clientX - rect.left) * scaleX;
              const y = (e.clientY - rect.top) * scaleY;
              const adjustedX = x / dpr;
              const adjustedY = y / dpr;

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

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface LockIconRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PerformanceStats {
  count: number;
  time: number;
}

let currentRect: Rect | null = null;
let currentLockIconRect: LockIconRect | null = null;
let dpr: number =
  typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
let animationFrameId: number | null = null;

const linearInterpolation = (start: number, end: number, t: number) => {
  return start * (1 - t) + end * t;
};

const drawHoverOverlay = (
  overlayElement: HTMLElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  kind: 'locked' | 'inspecting',
) => {
  console.log('draw hover overlay');
  const res = getNearestFiberFromElement(overlayElement);
  if (!res) {
    return;
  }
  const [associatedFiber] = res;
  const currentAssociatedFiber = isCurrentTree(associatedFiber)
    ? associatedFiber
    : (associatedFiber.alternate ?? associatedFiber);
  const stateNode = getFirstStateNode(currentAssociatedFiber);
  if (!stateNode) {
    return;
  }
  const targetRect = getRect(stateNode);
  if (!targetRect) {
    return;
  }

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
    ReactScanInternals.reportDataFiber.get(parentCompositeFiber) ||
    (parentCompositeFiber.alternate
      ? ReactScanInternals.reportDataFiber.get(parentCompositeFiber.alternate)
      : null);

  const stats: PerformanceStats = {
    count: reportDataFiber?.count ?? 0,
    time: reportDataFiber?.time ?? 0,
  };

  ctx.save();

  if (!currentRect) {
    drawRect(targetRect, canvas, ctx, kind, stats, parentCompositeFiber);
    currentRect = targetRect;
  } else {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
    }

    const animate = () => {
      currentRect = {
        left: linearInterpolation(currentRect!.left, targetRect.left, 0.1),
        top: linearInterpolation(currentRect!.top, targetRect.top, 0.1),
        width: linearInterpolation(currentRect!.width, targetRect.width, 0.1),
        height: linearInterpolation(
          currentRect!.height,
          targetRect.height,
          0.1,
        ),
      };

      drawRect(currentRect, canvas, ctx, kind, stats, parentCompositeFiber);

      const stillMoving =
        Math.abs(currentRect.left - targetRect.left) > 0.1 ||
        Math.abs(currentRect.top - targetRect.top) > 0.1 ||
        Math.abs(currentRect.width - targetRect.width) > 0.1 ||
        Math.abs(currentRect.height - targetRect.height) > 0.1;

      if (stillMoving) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        currentRect = targetRect;
        animationFrameId = null;
      }
    };

    animationFrameId = requestAnimationFrame(animate);
  }

  ctx.restore();
};

const updateCanvasSize = (
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
) => {
  if (!canvas) return;
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);

  if (ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }
};

const drawLockIcon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) => {
  ctx.save();
  ctx.strokeStyle = 'white';
  ctx.fillStyle = 'white';
  ctx.lineWidth = 1.5;

  const shackleWidth = size * 0.6;
  const shackleHeight = size * 0.5;
  const shackleX = x + (size - shackleWidth) / 2;
  const shackleY = y;

  // Shackle
  ctx.beginPath();
  ctx.arc(
    shackleX + shackleWidth / 2,
    shackleY + shackleHeight / 2,
    shackleWidth / 2,
    Math.PI,
    0,
    false,
  );
  ctx.stroke();

  // Body
  const bodyWidth = size * 0.8;
  const bodyHeight = size * 0.5;
  const bodyX = x + (size - bodyWidth) / 2;
  const bodyY = y + shackleHeight / 2;

  ctx.fillRect(bodyX, bodyY, bodyWidth, bodyHeight);

  ctx.restore();
};

const drawStatsPill = (
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  stats: PerformanceStats,
  kind: 'locked' | 'inspecting',
  fiber: Fiber | null,
) => {
  const pillHeight = 24;
  const pillPadding = 8;
  const componentName = fiber ? getDisplayName(fiber) || 'Unknown' : 'Unknown';
  const text = `${componentName} • ${stats.count} renders • ${stats.time.toFixed(1)}ms`;

  ctx.save();
  ctx.font = '12px system-ui, -apple-system, sans-serif';
  const textMetrics = ctx.measureText(text);
  const textWidth = textMetrics.width;
  const lockIconSize = kind === 'locked' ? 14 : 0;
  const lockIconPadding = kind === 'locked' ? 6 : 0;
  const pillWidth =
    textWidth + pillPadding * 2 + lockIconSize + lockIconPadding;

  const pillX = rect.left;
  const pillY = rect.top - pillHeight - 4;

  ctx.fillStyle = 'rgb(37, 37, 38, .9)';
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 3);
  ctx.fill();

  if (kind === 'locked') {
    const lockX = pillX + pillPadding;
    const lockY = pillY + (pillHeight - lockIconSize) / 2 + 2;
    drawLockIcon(ctx, lockX, lockY, lockIconSize);
    currentLockIconRect = {
      x: lockX,
      y: lockY,
      width: lockIconSize,
      height: lockIconSize,
    };
  } else {
    currentLockIconRect = null;
  }

  ctx.fillStyle = 'white';
  ctx.textBaseline = 'middle';
  const textX =
    pillX +
    pillPadding +
    (kind === 'locked' ? lockIconSize + lockIconPadding : 0);
  ctx.fillText(text, textX, pillY + pillHeight / 2);
  ctx.restore();
};

const drawRect = (
  rect: Rect,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  kind: 'locked' | 'inspecting',
  stats: PerformanceStats,
  fiber: Fiber | null,
) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw the main rectangle
  if (kind === 'locked') {
    ctx.strokeStyle = 'rgba(130, 255, 170, 0.6)';
    ctx.fillStyle = 'rgba(130, 255, 170, 0.1)';
  } else {
    ctx.strokeStyle = 'rgba(130, 170, 255, 0.6)';
    ctx.fillStyle = 'rgba(130, 170, 255, 0.1)';
  }

  ctx.lineWidth = 1;
  ctx.fillRect(rect.left, rect.top, rect.width, rect.height);
  ctx.strokeRect(rect.left, rect.top, rect.width, rect.height);

  drawStatsPill(ctx, rect, stats, kind, fiber);
};
let prevChangedProps = new Set<string>();
let prevChangedState = new Set<string>();

const renderPropsAndState = (
  didRender: boolean, // this may be called even when the component did not render, so this is necessary information
  fiber: any,
  reportDataFiber: any,
  propsContainer: HTMLDivElement,
) => {
  const componentName =
    fiber.type?.displayName || fiber.type?.name || 'Unknown';
  const props = fiber.pendingProps || {};
  const state = getStateFromFiber(fiber) || {};

  const renderCount = reportDataFiber?.count || 0;
  const renderTime = reportDataFiber?.time?.toFixed(2) || '0';

  const changedProps = new Set(getChangedProps(fiber));
  const changedState = new Set(getChangedState(fiber));
  propsContainer.innerHTML = '';

  const inspector = document.createElement('div');
  inspector.className = 'react-scan-inspector';

  const header = document.createElement('div');
  header.className = 'react-scan-header';
  header.innerHTML = `
    <span class="react-scan-component-name">${componentName}</span>
    <span class="react-scan-metrics">${renderCount} renders • ${renderTime}ms</span>
  `;
  inspector.appendChild(header);

  const content = document.createElement('div');
  content.className = 'react-scan-content';

  content.appendChild(
    renderSection(
      didRender,
      propsContainer,
      'Props',
      props,
      changedProps,
      prevChangedProps,
    ),
  );
  content.appendChild(
    renderSection(
      didRender,
      propsContainer,
      'State',
      state,
      changedState,
      prevChangedState,
    ),
  );

  inspector.appendChild(content);
  propsContainer.appendChild(inspector);

  prevChangedProps = changedProps;
  prevChangedState = changedState;

  requestAnimationFrame(() => {
    const contentHeight = inspector.getBoundingClientRect().height;
    propsContainer.style.maxHeight = `${contentHeight}px`;
  });
};

const renderSection = (
  didRender: boolean,
  propsContainer: HTMLDivElement,
  title: string,
  data: any,
  changedKeys: Set<string> = new Set(),
  prevChangedKeys: Set<string> = new Set(),
) => {
  const section = document.createElement('div');
  section.className = 'react-scan-section';
  section.textContent = title;

  Object.entries(data).forEach(([key, value]) => {
    section.appendChild(
      createPropertyElement(
        didRender,
        propsContainer,
        key,
        value,
        title.toLowerCase(),
        0,
        changedKeys,

        // prevChangedKeys,
      ),
    );
  });

  return section;
};
const getPath = (section: string, parentPath: string, key: string) => {
  return parentPath ? `${parentPath}.${key}` : `${section}.${key}`;
};
const fadeOutTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();
const EXPANDED_PATHS = new Set<string>();

const createPropertyElement = (
  didRender: boolean,
  propsContainer: HTMLDivElement,
  key: string,
  value: any,
  section = '',
  level = 0,
  changedKeys: Set<string> = new Set(),
  parentPath = '',
) => {
  const container = document.createElement('div');
  container.className = 'react-scan-property';

  const isExpandable =
    (typeof value === 'object' && value !== null) || Array.isArray(value);

  if (isExpandable) {
    const currentPath = getPath(section, parentPath, key);
    const isExpanded = EXPANDED_PATHS.has(currentPath);

    container.classList.add('react-scan-expandable');
    if (isExpanded) {
      container.classList.add('react-scan-expanded');
    }
    const arrow = document.createElement('span');
    arrow.className = 'react-scan-arrow';
    arrow.textContent = '▶';
    container.appendChild(arrow);

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'react-scan-property-content';

    const preview = document.createElement('div');
    preview.className = 'react-scan-preview-line';
    preview.dataset.key = key;
    preview.dataset.section = section;
    preview.innerHTML = `
        <span class="react-scan-key">${key}</span>: <span class="${getValueClassName(
          value,
        )}">${getValuePreview(value)}</span>
      `;

    const content = document.createElement('div');
    content.className = isExpanded
      ? 'react-scan-nested-object'
      : 'react-scan-nested-object react-scan-hidden';

    if (Array.isArray(value)) {
      const arrayContainer = document.createElement('div');
      arrayContainer.className = 'react-scan-array-container';
      value.forEach((item, index) => {
        arrayContainer.appendChild(
          createPropertyElement(
            didRender,
            propsContainer,
            index.toString(),
            item,
            section,
            level + 1,
            // currentPath
            changedKeys,
            currentPath,
          ),
        );
      });
      content.appendChild(arrayContainer);
    } else {
      Object.entries(value).forEach(([k, v]) => {
        content.appendChild(
          createPropertyElement(
            didRender,
            propsContainer,
            k,
            v,
            section,
            level + 1,
            changedKeys,
            currentPath,
          ),
        );
      });
    }

    contentWrapper.appendChild(preview);
    contentWrapper.appendChild(content);
    container.appendChild(contentWrapper);

    container.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanding = !container.classList.contains('react-scan-expanded');

      if (isExpanding) {
        EXPANDED_PATHS.add(currentPath);
        container.classList.add('react-scan-expanded');
        content.classList.remove('react-scan-hidden');
      } else {
        EXPANDED_PATHS.delete(currentPath);
        container.classList.remove('react-scan-expanded');
        content.classList.add('react-scan-hidden');
      }

      requestAnimationFrame(() => {
        const inspector = propsContainer.firstElementChild as HTMLElement;
        if (inspector) {
          const contentHeight = inspector.getBoundingClientRect().height;
          propsContainer.style.maxHeight = `${contentHeight}px`;
        }
      });
    });
  } else {
    const preview = document.createElement('div');
    preview.className = 'react-scan-preview-line';
    preview.dataset.key = key;
    preview.dataset.section = section;
    preview.innerHTML = `
        <span style="width: 8px; display: inline-block"></span>
        <span class="react-scan-key">${key}</span>: <span class="${getValueClassName(
          value,
        )}">${getValuePreview(value)}</span>
      `;
    container.appendChild(preview);
  }

  const isChanged = changedKeys.has(key) && didRender;

  const flashOverlay = document.createElement('div');
  flashOverlay.className = 'react-scan-flash-overlay';
  container.appendChild(flashOverlay);

  if (isChanged) {
    // If it's already flashing set opacity back to peak
    flashOverlay.style.opacity = '0.5';

    const existingTimer = fadeOutTimers.get(flashOverlay);
    if (existingTimer !== undefined) {
      clearTimeout(existingTimer);
    }

    const timerId = setTimeout(() => {
      flashOverlay.style.transition = 'opacity 400ms ease-out';
      flashOverlay.style.opacity = '0';
      fadeOutTimers.delete(flashOverlay);
    }, 300);

    fadeOutTimers.set(flashOverlay, timerId);
  }

  return container;
};

const getValueClassName = (value: any) => {
  if (Array.isArray(value)) return 'react-scan-array';
  if (value === null || value === undefined) return 'react-scan-null';
  switch (typeof value) {
    case 'string':
      return 'react-scan-string';
    case 'number':
      return 'react-scan-number';
    case 'boolean':
      return 'react-scan-boolean';
    case 'object':
      return 'react-scan-object-key';
    default:
      return '';
  }
};
const getValuePreview = (value: any) => {
  if (Array.isArray(value)) {
    return `Array(${value.length})`;
  }
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  switch (typeof value) {
    case 'string':
      return `"${value}"`;
    case 'number':
      return value.toString();
    case 'boolean':
      return value.toString();
    case 'object': {
      const keys = Object.keys(value);
      if (keys.length <= 3) {
        return `{${keys.join(', ')}}`;
      }
      return `{${keys.slice(0, 3).join(', ')}, ...}`;
    }
    default:
      return typeof value;
  }
};
