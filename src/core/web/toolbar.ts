import { ReactScanInternals } from '../../index';
import { createElement } from './utils';
import { MONO_FONT } from './outline';

export const createToolbar = () => {
  const status = createElement(
    `<div id="react-scan-toolbar" title="Number of unnecessary renders and time elapsed" style="position:fixed;bottom:3px;right:3px;background:rgba(0,0,0,0.5);padding:4px 8px;border-radius:4px;color:white;z-index:2147483647;font-family:${MONO_FONT}" aria-hidden="true">react-scan</div>`,
  ) as HTMLDivElement;

  let isHidden = localStorage.getItem('react-scan-hidden') === 'true';

  const updateVisibility = () => {
    const overlay = document.getElementById('react-scan-overlay');
    if (!overlay) return;
    overlay.style.display = isHidden ? 'none' : 'block';
    status.textContent = isHidden ? 'start ►' : 'stop ⏹';
    ReactScanInternals.isPaused = isHidden;
    if (ReactScanInternals.isPaused) {
      ReactScanInternals.activeOutlines = [];
      ReactScanInternals.scheduledOutlines = [];
    }
    localStorage.setItem('react-scan-hidden', isHidden.toString());
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

  const prevElement = document.getElementById('react-scan-toolbar');
  if (prevElement) {
    prevElement.remove();
  }
  document.documentElement.appendChild(status);

  return status;
};
