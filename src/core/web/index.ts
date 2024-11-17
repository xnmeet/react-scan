import { recalcOutlines } from './outline';
import { createElement, onIdle } from './utils';

export const createCanvas = () => {
  const canvas = createElement(
    `<canvas id="react-scan-overlay" style="position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483646" aria-hidden="true"/>`,
  ) as HTMLCanvasElement;
  const ctx = canvas.getContext('2d');

  let resizeScheduled = false;

  const resize = () => {
    const dpi = window.devicePixelRatio;
    canvas.width = dpi * window.innerWidth;
    canvas.height = dpi * window.innerHeight;
    ctx?.scale(dpi, dpi);
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

  onIdle(() => {
    const prevCanvas = document.getElementById('react-scan-overlay');
    if (prevCanvas) {
      prevCanvas.remove();
    }
    document.documentElement.appendChild(canvas);
  });

  return ctx;
};
