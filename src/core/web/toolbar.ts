import { getReport, ReactScanInternals } from '../../index';
import { createElement } from './utils';
import { MONO_FONT } from './outline';

export const createToolbar = () => {
  const status = createElement(
    `<div id="react-scan-toolbar" title="Number of unnecessary renders and time elapsed" style="position:fixed;bottom:3px;right:3px;background:rgba(0,0,0,0.5);padding:4px 8px;border-radius:4px;color:white;z-index:2147483647;font-family:${MONO_FONT}" aria-hidden="true">react-scan</div>`,
  ) as HTMLDivElement;

  // Create a scrollable and resizable div containing checkboxes
  const checkboxContainer = createElement(
    `<div id="react-scan-checkbox-list" style="position:fixed;bottom:3px;left:3px;min-width:140px;height:150px;background:#fff;padding:2px 4px;border:1px solid #ccc;border-radius:4px;z-index:2147483647;font-family:${MONO_FONT};overflow-y:auto;resize:horizontal;">
    </div>`,
  ) as HTMLDivElement;

  document.documentElement.appendChild(checkboxContainer);

  let isHidden =
    // Discord doesn't support localStorage
    'localStorage' in globalThis &&
    localStorage.getItem('react-scan-hidden') === 'true';

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

  const prevElement = document.getElementById('react-scan-toolbar');
  if (prevElement) {
    prevElement.remove();
  }
  document.documentElement.appendChild(status);

  return status;
};

export const renderCheckbox = () => {
  const checkboxContainer = document.getElementById('react-scan-checkbox-list');
  if (!checkboxContainer) return;

  checkboxContainer.innerHTML = '';

  for (const [name, { count, time }] of Object.entries(getReport())) {
    const label = createElement(
      `<label style="display:block;"><input type="checkbox" value="${name}"> ${name} (✖︎${count}, ${time.toFixed(2)}ms)</label>`,
    ) as HTMLLabelElement;

    const checkbox = label.querySelector('input')!;
    checkbox.checked = ReactScanInternals.componentNameAllowList.has(name);

    checkbox.addEventListener('change', () => {
      if (checkbox.checked)
        ReactScanInternals.componentNameAllowList.add(name);
      else ReactScanInternals.componentNameAllowList.delete(name);
    });

    checkboxContainer.appendChild(label);
  }
};
