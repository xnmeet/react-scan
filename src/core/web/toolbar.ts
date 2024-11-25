import { ReactScanInternals } from '../../index';
import { createElement } from './utils';
import { MONO_FONT } from './outline';
import { INSPECT_TOGGLE_ID } from './inspect-element/inspect-state-machine';
import { getNearestFiberFromElement } from './inspect-element/utils';

let isDragging = false;
export const createToolbar = () => {
  if (typeof window === 'undefined') {
    return;
  }

  // const PLAY_SVG = `
  //   <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  //     <polygon points="6 3 20 12 6 21 6 3"/>
  //   </svg>
  // `;

  const PAUSE_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-power"><path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77.04"/></svg>
  `;
  const PLAY_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-power-off"><path d="M18.36 6.64A9 9 0 0 1 20.77 15"/><path d="M6.16 6.16a9 9 0 1 0 12.68 12.68"/><path d="M12 2v4"/><path d="m2 2 20 20"/></svg>
  `;
  const INSPECTING_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square-dashed-mouse-pointer"><path d="M12.034 12.681a.498.498 0 0 1 .647-.647l9 3.5a.5.5 0 0 1-.033.943l-3.444 1.068a1 1 0 0 0-.66.66l-1.067 3.443a.5.5 0 0 1-.943.033z"/><path d="M5 3a2 2 0 0 0-2 2"/><path d="M19 3a2 2 0 0 1 2 2"/><path d="M5 21a2 2 0 0 1-2-2"/><path d="M9 3h1"/><path d="M9 21h2"/><path d="M14 3h1"/><path d="M3 9v1"/><path d="M21 9v2"/><path d="M3 14v1"/></svg>`;
  const FOCUSING_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square-mouse-pointer"><path d="M12.034 12.681a.498.498 0 0 1 .647-.647l9 3.5a.5.5 0 0 1-.033.943l-3.444 1.068a1 1 0 0 0-.66.66l-1.067 3.443a.5.5 0 0 1-.943.033z"/><path d="M21 11V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6"/></svg>`;
  const PREVIOUS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-undo-2"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11"/></svg>`;
  const TRANSITION_MS = '150ms';

  const toolbar = createElement(`
  <div id="react-scan-toolbar" style="
    position: fixed;
    z-index: 2147483647;
    font-family: ${MONO_FONT};
    font-size: 13px;
    background: transparent;
    user-select: none;
    right: 24px;
    bottom: 24px;
    display: flex;
    flex-direction: column-reverse;
    align-items: flex-end;
    pointer-events: none;
    max-height: 450px;
  ">
    <div id="react-scan-toolbar-content" style="
      background: rgba(0, 0, 0, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      display: flex;
      flex-direction: column-reverse;
      cursor: move;
      pointer-events: auto;
      overflow: hidden;
      width: fit-content;
      min-width: min-content;
    ">
      <div style="display: flex; align-items: center; height: 36px; width: fit-content;">
        <button id="${INSPECT_TOGGLE_ID}" style="
          padding: 0 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          color: #fff;
          cursor: pointer;
          transition: all ${TRANSITION_MS} ease;
          height: 100%;
          min-width: 36px;
          outline: none;
        " title="Inspect element">
          ${INSPECTING_SVG}
        </button>
        <button id="react-scan-power" style="
          padding: 0 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          color: #fff;
          cursor: pointer;
          transition: all ${TRANSITION_MS} ease;
          height: 100%;
          min-width: 36px;
          outline: none;
        " title="Start">
          ${PLAY_SVG}
        </button>
        <div style="
          padding: 0 12px;
          color: #fff;
          border-left: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          height: 100%;
          flex: 1;
        ">
          <span style="font-size: 14px; margin-right: 24px; font-weight: 500;">react-scan</span>
          <div style="display: flex; gap: 8px; align-items: center;">
            <button id="react-scan-parent-focus" style="
              padding: 4px 10px;
              display: none;
              align-items: center;
              justify-content: center;
              background: none;
              color: #fff;
              cursor: pointer;
              transition: all ${TRANSITION_MS} ease;
              height: 26px;
              outline: none;
               border: none;
              font-size: 12px;
              white-space: nowrap;
            ">go to parent</button>
            <button id="react-scan-previous-focus" style="
              padding: 4px 10px;
              display: none;
              align-items: center;
              justify-content: center;
              background: none;
              color: #fff;
              cursor: pointer;
              transition: all ${TRANSITION_MS} ease;
              height: 26px;
              outline: none;
               border: none;
              font-size: 12px;
              white-space: nowrap;
            ">${PREVIOUS_SVG}</button>
          </div>
        </div>
      </div>
      <div id="react-scan-props" style="
        pointer-events: auto;
        background: #000;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        width: 360px;
        overflow: auto;
        max-height: 0;
        transition: max-height 500ms cubic-bezier(0, 0.95, 0.1, 1);
      ">
        <!-- Props content will be injected here -->
      </div>
    </div>
  </div>
`) as HTMLDivElement;

  const styleElement = document.createElement('style');
  styleElement.textContent = `
  #react-scan-toolbar {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  }

  .react-scan-inspector {
    font-size: 13px;
    width: 360px;
    color: #fff;
  }

  .react-scan-header {
    padding: 8px 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    gap: 8px;
    align-items: center;
    background: #000;
  }

  .react-scan-component-name {
    font-weight: 500;
    color: #fff;
  }

  .react-scan-metrics {
    color: #888;
    font-size: 12px;
  }

  .react-scan-content {
    padding: 12px;
    background: #000;
  }

  .react-scan-section {
    color: #888;
    margin-bottom: 16px;
    font-size: 12px;
  }

  .react-scan-section:last-child {
    margin-bottom: 0;
  }

  .react-scan-property {
    margin-left: 14px;
    margin-top: 8px;
    position: relative;
  }

  .react-scan-section > .react-scan-property:first-child {
    margin-top: 4px;
  }

  .react-scan-key {
    color: #fff;
  }

  .react-scan-string {
    color: #9ECBFF;
  }

  .react-scan-number {
    color: #79C7FF;
  }

  .react-scan-boolean {
    color: #56B6C2;
  }

  .react-scan-object-key {
    color: #fff;
  }

  .react-scan-array {
    color: #fff;
  }

  .react-scan-expandable {
    display: flex;
    align-items: flex-start;
  }

  .react-scan-arrow {
    cursor: pointer;
    content: '▶';
    display: inline-block;
    font-size: 8px;
    margin: 5px 4px 0 0;
    transition: transform ${TRANSITION_MS} ease;
    width: 8px;
    flex-shrink: 0;
    color: #888;
  }

  .react-scan-expanded > .react-scan-arrow {
    transform: rotate(90deg);
  }

  .react-scan-property-content {
    flex: 1;
    min-width: 0;
  }

  .react-scan-hidden {
    display: none;
  }

  .react-scan-array-container {
    overflow-y: auto;
    margin-left: 14px;
    margin-top: 8px;
    border-left: 1px solid rgba(255, 255, 255, 0.1);
    padding-left: 8px;
  }

  .react-scan-nested-object {
    margin-left: 14px;
    margin-top: 8px;
    border-left: 1px solid rgba(255, 255, 255, 0.1);
    padding-left: 8px;
  }

  .react-scan-nested-object > .react-scan-property {
    margin-top: 8px;
  }

  .react-scan-nested-object > .react-scan-property:first-child {
    margin-top: 0;
  }

 .react-scan-preview-line {
  position: relative;
  padding: 3px 6px;
  border-radius: 4px;
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
}
.react-scan-flash-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(142, 97, 227, 1);
  pointer-events: none;
  opacity: 0;
  z-index: 999999;
  mix-blend-mode: multiply;
  transition: opacity ${TRANSITION_MS} ease-in;
  border-radius: 4px;
}

.react-scan-flash-active {
  opacity: 0.4;
  transition: opacity 300ms ease-in-out;
}

  /* Hover states */
  #react-scan-toolbar button:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  #react-scan-toolbar button:active {
    background: rgba(255, 255, 255, 0.15);
  }

  /* Focus states */
  #react-scan-toolbar button:focus-visible {
    outline: 2px solid #0070F3;
    outline-offset: -2px;
  }

  /* Scrollbar styling */
  .react-scan-props::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  .react-scan-props::-webkit-scrollbar-track {
    background: transparent;
  }

  .react-scan-props::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
  }

  .react-scan-props::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }
  `;

  document.head.appendChild(styleElement);

  const inspectBtn = toolbar.querySelector(
    `#${INSPECT_TOGGLE_ID}`,
  ) as HTMLButtonElement;
  const powerBtn = toolbar.querySelector(
    '#react-scan-power',
  ) as HTMLButtonElement;
  const parentFocusBtn = toolbar.querySelector(
    '#react-scan-parent-focus',
  ) as HTMLButtonElement;
  const previousFocusBtn = toolbar.querySelector(
    '#react-scan-previous-focus',
  ) as HTMLButtonElement;

  let focusHistory: Array<HTMLElement> = [];
  const propContainer = toolbar.querySelector(
    '#react-scan-props',
  ) as HTMLDivElement;
  const toolbarContent = toolbar.querySelector(
    '#react-scan-toolbar-content',
  ) as HTMLDivElement;

  let isActive = !ReactScanInternals.isPaused;

  document.body.appendChild(toolbar);

  let initialX = 0;
  let initialY = 0;
  let currentX = 0;
  let currentY = 0;

  const updateToolbarPosition = (x: number, y: number) => {
    toolbar.style.transform = `translate(${x}px, ${y}px)`;
  };

  updateToolbarPosition(0, 0);

  toolbarContent.addEventListener('mousedown', (e) => {
    if (
      e.target === inspectBtn ||
      e.target === powerBtn ||
      e.target === parentFocusBtn
    )
      return;

    isDragging = true;
    const transform = new DOMMatrix(getComputedStyle(toolbar).transform);
    currentX = transform.m41;
    currentY = transform.m42;

    initialX = e.clientX - currentX;
    initialY = e.clientY - currentY;

    toolbar.style.transition = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const x = e.clientX - initialX;
    const y = e.clientY - initialY;

    currentX = x;
    currentY = y;
    updateToolbarPosition(x, y);
  });

  document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    toolbar.style.transition = '';
  });

  const updateNavigationButtons = (
    state: typeof ReactScanInternals.inspectState,
  ) => {
    if (state.kind === 'focused') {
      const { focusedDomElement } = state;
      if (!focusedDomElement) {
        parentFocusBtn.style.display = 'none';
        previousFocusBtn.style.display = 'none';
        return;
      }

      let hasValidParent = false;
      if (focusedDomElement.parentElement) {
        let currentFiber = getNearestFiberFromElement(focusedDomElement);
        let nextParent: typeof focusedDomElement.parentElement | null =
          focusedDomElement.parentElement;

        while (nextParent) {
          const parentFiber = getNearestFiberFromElement(nextParent);
          if (!parentFiber || parentFiber !== currentFiber) {
            hasValidParent = true;
            break;
          }
          nextParent = nextParent.parentElement;
        }
      }

      parentFocusBtn.style.display = 'flex';
      parentFocusBtn.style.color = hasValidParent ? '#999' : '#444';
      parentFocusBtn.style.cursor = hasValidParent ? 'pointer' : 'not-allowed';

      previousFocusBtn.style.display = 'flex';
      previousFocusBtn.style.color = focusHistory.length > 0 ? '#999' : '#444';
      previousFocusBtn.style.cursor =
        focusHistory.length > 0 ? 'pointer' : 'not-allowed';
    } else {
      parentFocusBtn.style.display = 'none';
      previousFocusBtn.style.display = 'none';
    }
  };

  const updateUI = () => {
    powerBtn.innerHTML = isActive ? PAUSE_SVG : PLAY_SVG;
    powerBtn.title = isActive ? 'Stop' : 'Start';
    powerBtn.style.color = isActive ? '#fff' : '#999';
    const focusActive = ReactScanInternals.inspectState.kind === 'focused';

    const isInspectActive =
      ReactScanInternals.inspectState.kind === 'inspecting';

    if (isInspectActive) {
      inspectBtn.innerHTML = INSPECTING_SVG;
      inspectBtn.style.color = `rgba(142, 97, 227, 0.7)`;
    } else if (focusActive) {
      inspectBtn.innerHTML = FOCUSING_SVG;
      inspectBtn.style.color = 'rgba(142, 97, 227, 1)';
    } else {
      inspectBtn.style.color = '#999';
    }

    if (!isInspectActive && !focusActive) {
      propContainer.style.maxHeight = '0';
      propContainer.style.width = 'fit-content';
      propContainer.innerHTML = '';
    }

    updateNavigationButtons(ReactScanInternals.inspectState);
  };

  powerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    isActive = !isActive;
    ReactScanInternals.isPaused = !isActive;
    localStorage.setItem(
      'react-scan-paused',
      String(ReactScanInternals.isPaused),
    ),
      updateUI();
  });

  inspectBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const currentState = ReactScanInternals.inspectState;

    switch (currentState.kind) {
      case 'inspecting': {
        propContainer.innerHTML = '';
        propContainer.style.maxHeight = '0';
        propContainer.style.width = 'fit-content';

        ReactScanInternals.inspectState = {
          kind: 'inspect-off',
          propContainer: currentState.propContainer,
        };

        setTimeout(() => {
          if (ReactScanInternals.inspectState.kind === 'inspect-off') {
            // race condition safety net
            ReactScanInternals.inspectState = {
              kind: 'inspect-off',
              propContainer: currentState.propContainer,
            };
          }
        }, 500);
        return;
      }
      case 'focused': {
        propContainer.style.maxHeight = '0';
        propContainer.style.width = 'fit-content';
        propContainer.innerHTML = '';
        ReactScanInternals.inspectState = {
          kind: 'inspecting',
          hoveredDomElement: currentState.focusedDomElement,
          propContainer: currentState.propContainer,
        };
        break;
      }
      case 'inspect-off': {
        ReactScanInternals.inspectState = {
          kind: 'inspecting',
          hoveredDomElement: null,
          propContainer,
        };
        break;
      }
    }
    updateUI();
  });

  parentFocusBtn.addEventListener('click', (e) => {
    e.stopPropagation();

    const currentState = ReactScanInternals.inspectState;
    if (currentState.kind !== 'focused') return;

    const { focusedDomElement } = currentState;
    if (!focusedDomElement || !focusedDomElement.parentElement) return;

    focusHistory.push(focusedDomElement);

    let nextParent: typeof focusedDomElement.parentElement | null =
      focusedDomElement.parentElement;
    let currentFiber = getNearestFiberFromElement(focusedDomElement);

    while (nextParent) {
      const parentFiber = getNearestFiberFromElement(nextParent);
      if (
        !parentFiber ||
        parentFiber.memoizedProps !== currentFiber?.memoizedProps
      ) {
        break;
      }
      nextParent = nextParent.parentElement;
    }

    if (!nextParent) return;

    ReactScanInternals.inspectState = {
      kind: 'focused',
      focusedDomElement: nextParent,
      propContainer: currentState.propContainer,
    };
  });

  previousFocusBtn.addEventListener('click', (e) => {
    e.stopPropagation();

    const currentState = ReactScanInternals.inspectState;
    if (currentState.kind !== 'focused' || focusHistory.length === 0) return;

    const previousElement = focusHistory.pop();
    if (!previousElement) {
      return; // invariant this exists
    }

    ReactScanInternals.inspectState = {
      kind: 'focused',
      focusedDomElement: previousElement,
      propContainer: currentState.propContainer,
    };
  });

  updateUI();

  const existing = document.getElementById('react-scan-toolbar');
  if (existing) existing.remove();

  if (!toolbar.parentElement) {
    document.body.appendChild(toolbar);
  }

  ReactScanInternals.inspectState = {
    kind: 'inspect-off',
    propContainer,
  };

  ReactScanInternals.subscribe('inspectState', () => {
    updateUI();
  });
};
