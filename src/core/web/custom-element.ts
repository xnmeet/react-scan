import { ReactScanInternals } from '../../index';
import { MONO_FONT, recalcOutlines } from './outline';

class ReactScanOverlay extends HTMLElement {
  private canvas: HTMLCanvasElement;
  private toolbar: HTMLDivElement;
  private ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

  constructor() {
    super();

    const shadow = this.attachShadow({ mode: 'open' });

    this.setupCanvas();
    this.setupToolbar();

    shadow.appendChild(this.canvas);
    shadow.appendChild(this.toolbar);
  }

  public getContext() {
    return this.ctx;
  }

  public getToolbar() {
    return this.toolbar;
  }

  private setupCanvas() {
    this.canvas = document.createElement('canvas');

    this.canvas.id = 'react-scan-canvas';
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100vw';
    this.canvas.style.height = '100vh';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '2147483646';
    this.canvas.setAttribute('aria-hidden', 'true');

    const isOffscreenCanvasSupported = 'OffscreenCanvas' in globalThis;
    const offscreenCanvas = isOffscreenCanvasSupported
      ? this.canvas.transferControlToOffscreen()
      : this.canvas;

    this.ctx = offscreenCanvas.getContext('2d') as
      | OffscreenCanvasRenderingContext2D
      | CanvasRenderingContext2D;

    let resizeScheduled = false;

    const resize = () => {
      const dpi = window.devicePixelRatio || 1;
      this.ctx.canvas.width = dpi * window.innerWidth;
      this.ctx.canvas.height = dpi * window.innerHeight;
      this.canvas.style.width = `${window.innerWidth}px`;
      this.canvas.style.height = `${window.innerHeight}px`;

      this.ctx.resetTransform();
      this.ctx.scale(dpi, dpi);

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
  }

  private setupToolbar() {
    this.toolbar = document.createElement('div');

    this.toolbar.id = 'react-scan-toolbar';
    this.toolbar.title = 'Number of unnecessary renders and time elapsed';
    this.toolbar.style.position = 'fixed';
    this.toolbar.style.bottom = '3px';
    this.toolbar.style.right = '3px';
    this.toolbar.style.background = 'rgba(0,0,0,0.5)';
    this.toolbar.style.padding = '4px 8px';
    this.toolbar.style.borderRadius = '4px';
    this.toolbar.style.color = 'white';
    this.toolbar.style.zIndex = '2147483647';
    this.toolbar.style.fontFamily = MONO_FONT;
    this.toolbar.setAttribute('aria-hidden', 'true');
    this.toolbar.textContent = 'react-scan';

    let isHidden =
      // discord doesn't support localStorage
      'localStorage' in globalThis &&
      localStorage.getItem('react-scan-hidden') === 'true';

    const updateVisibility = () => {
      this.canvas.style.display = isHidden ? 'none' : 'block';
      this.toolbar.textContent = isHidden ? 'start ►' : 'stop ⏹';
      ReactScanInternals.isPaused = isHidden;
      if (ReactScanInternals.isPaused) {
        ReactScanInternals.activeOutlines = [];
        ReactScanInternals.scheduledOutlines = [];
      }
      if ('localStorage' in globalThis) {
        localStorage.setItem('react-scan-hidden', isHidden.toString());
      }
    };

    updateVisibility();

    this.toolbar.addEventListener('click', () => {
      isHidden = !isHidden;
      updateVisibility();
    });

    this.toolbar.addEventListener('mouseenter', () => {
      this.toolbar.textContent = isHidden ? 'start ►' : 'stop ⏹';
      this.toolbar.style.backgroundColor = 'rgba(0,0,0,1)';
    });

    this.toolbar.addEventListener('mouseleave', () => {
      this.toolbar.style.backgroundColor = 'rgba(0,0,0,0.5)';
    });
  }
}

export { ReactScanOverlay };
