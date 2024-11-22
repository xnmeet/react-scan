import { ReactScanInternals } from '../../index';

export const createToolbar = (shadowRoot: ShadowRoot) => {
  const status = shadowRoot.getElementById(
    'react-scan-toolbar',
  ) as HTMLDivElement;

  let isHidden =
    // discord doesn't support localStorage
    'localStorage' in globalThis &&
    localStorage.getItem('react-scan-hidden') === 'true';

  const updateVisibility = () => {
    const canvas = shadowRoot.getElementById('react-scan-canvas');
    if (!canvas) return;
    canvas.style.display = isHidden ? 'none' : 'block';
    status.textContent = isHidden ? 'start ►' : 'stop ⏹';
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

  status.addEventListener('click', () => {
    isHidden = !isHidden;
    updateVisibility();
  });

  status.addEventListener('mouseenter', () => {
    status.textContent = isHidden ? 'start ►' : 'stop ⏹';
    status.style.backgroundColor = 'rgba(0,0,0,1)';
  });

  status.addEventListener('mouseleave', () => {
    status.style.backgroundColor = 'rgba(0,0,0,0.5)';
  });

  return status;
};
