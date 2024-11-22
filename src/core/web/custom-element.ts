import { MONO_FONT } from './outline';

class ReactScanOverlay extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });

    const canvas = document.createElement('canvas');
    canvas.id = 'react-scan-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '2147483646';
    canvas.setAttribute('aria-hidden', 'true');

    const toolbar = document.createElement('div');
    toolbar.id = 'react-scan-toolbar';
    toolbar.title = 'Number of unnecessary renders and time elapsed';
    toolbar.style.position = 'fixed';
    toolbar.style.bottom = '3px';
    toolbar.style.right = '3px';
    toolbar.style.background = 'rgba(0,0,0,0.5)';
    toolbar.style.padding = '4px 8px';
    toolbar.style.borderRadius = '4px';
    toolbar.style.color = 'white';
    toolbar.style.zIndex = '2147483647';
    toolbar.style.fontFamily = MONO_FONT;
    toolbar.setAttribute('aria-hidden', 'true');
    toolbar.textContent = 'react-scan';

    shadow.appendChild(canvas);
    shadow.appendChild(toolbar);
  }
}

customElements.define('react-scan-overlay', ReactScanOverlay);

export { ReactScanOverlay };
