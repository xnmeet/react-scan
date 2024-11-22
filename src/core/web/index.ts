import { recalcOutlines } from './outline';

export const createOverlay = (shadowRoot: ShadowRoot) => {
  const canvas = shadowRoot.getElementById(
    'react-scan-canvas',
  ) as HTMLCanvasElement;

  const isOffscreenCanvasSupported = 'OffscreenCanvas' in globalThis;
  const offscreenCanvas = isOffscreenCanvasSupported
    ? canvas.transferControlToOffscreen()
    : canvas;

  const ctx = offscreenCanvas.getContext('2d') as
    | OffscreenCanvasRenderingContext2D
    | CanvasRenderingContext2D;

  let resizeScheduled = false;

  const resize = () => {
    const dpi = window.devicePixelRatio || 1;
    ctx.canvas.width = dpi * window.innerWidth;
    ctx.canvas.height = dpi * window.innerHeight;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

    ctx.resetTransform();
    ctx.scale(dpi, dpi);

    resizeScheduled = false;
  };

  resize();

  window.addEventListener('resize', () => {
    recalcOutlines();
    if (!resizeScheduled) {
      resizeScheduled = true;
      requestAnimationFrame(() => {
        resize();
      });
    }
  });
  window.addEventListener('scroll', () => {
    recalcOutlines();
  });

  return ctx;
};
