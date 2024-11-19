import { getReport, ReactScanInternals } from '../../index';
import { createElement } from './utils';
import { MONO_FONT } from './outline';

export const createToolbar = () => {
  const status = createElement(
    `<div id="react-scan-toolbar" title="Number of unnecessary renders and time elapsed" style="position:fixed;bottom:3px;right:3px;background:rgba(0,0,0,0.5);padding:4px 8px;border-radius:4px;color:white;z-index:2147483647;font-family:${MONO_FONT}" aria-hidden="true">react-scan</div>`,
  ) as HTMLDivElement;

  // Create a scrollable and resizable div containing checkboxes
  const checkboxContainer = createElement(
    `<div id="react-scan-checkbox-list" style="position:fixed;bottom:3px;left:3px;min-width:140px;height:150px;background:#fff;padding:2px 4px;border:1px solid #ccc;border-radius:4px;z-index:2147483647;font-family:${MONO_FONT};overflow-y:auto;resize:horizontal;display:none;">
    </div>`,
  ) as HTMLDivElement;

  document.documentElement.appendChild(checkboxContainer);

  let isHidden =
    // Discord doesn't support localStorage
    'localStorage' in globalThis &&
    localStorage.getItem('react-scan-hidden') === 'true';

  let isCheckboxContainerHidden = true;

  const toggleButton = createElement(
    `<button style="margin-left:8px;background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.4);color:white;cursor:pointer;padding:3px 6px;border-radius:4px;font-size:16px;transition:all 0.2s;" title="Toggle component list">☰</button>`
  ) as HTMLButtonElement;

  
  const updateVisibility = () => {
    const overlay = document.getElementById('react-scan-overlay');
    if (!overlay) return;
    overlay.style.display = isHidden ? 'none' : 'block';
    status.textContent = isHidden ? 'start ►' : 'stop ⏹';
    status.appendChild(toggleButton);
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

  status.addEventListener('click', (e) => {
    if (e.target === toggleButton) return;
    isHidden = !isHidden;
    updateVisibility();
  });

  toggleButton.addEventListener('click', () => {
    isCheckboxContainerHidden = !isCheckboxContainerHidden;
    checkboxContainer.style.display = isCheckboxContainerHidden ? 'none' : 'block';
    renderCheckbox();
  });

  status.addEventListener('mouseenter', () => {
    if (status.textContent !== '☰') {
      status.textContent = isHidden ? 'start ►' : 'stop ⏹';
      status.appendChild(toggleButton);
    }
    status.style.backgroundColor = 'rgba(0,0,0,1)';
    toggleButton.style.backgroundColor = 'rgba(255,255,255,0.3)';
  });

  status.addEventListener('mouseleave', () => {
    status.style.backgroundColor = 'rgba(0,0,0,0.5)';
    toggleButton.style.backgroundColor = 'rgba(255,255,255,0.2)';
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
