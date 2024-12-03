import { useEffect, useRef, useState, useCallback } from 'preact/hooks';
import { render } from 'preact';
import { ReactScanInternals, setOptions, Store } from '../../index';
import { MONO_FONT } from './outline';
import { INSPECT_TOGGLE_ID } from './inspect-element/inspect-state-machine';
import { getNearestFiberFromElement } from './inspect-element/utils';

const EDGE_PADDING = 15;
const ANIMATION_DURATION = 300;
const TRANSITION_MS = '150ms';

const SVG = {
  PLAY: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye-off"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/></svg>`,
  PAUSE: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>`,
  INSPECTING: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square-dashed-mouse-pointer"><path d="M12.034 12.681a.498.498 0 0 1 .647-.647l9 3.5a.5.5 0 0 1-.033.943l-3.444 1.068a1 1 0 0 0-.66.66l-1.067 3.443a.5.5 0 0 1-.943.033z"/><path d="M5 3a2 2 0 0 0-2 2"/><path d="M19 3a2 2 0 0 1 2 2"/><path d="M5 21a2 2 0 0 1-2-2"/><path d="M9 3h1"/><path d="M9 21h2"/><path d="M14 3h1"/><path d="M3 9v1"/><path d="M21 9v2"/><path d="M3 14v1"/></svg>`,
  FOCUSING: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square-mouse-pointer"><path d="M12.034 12.681a.498.498 0 0 1 .647-.647l9 3.5a.5.5 0 0 1-.033.943l-3.444 1.068a1 1 0 0 0-.66.66l-1.067 3.443a.5.5 0 0 1-.943.033z"/><path d="M21 11V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6"/></svg>`,
  NEXT: `<svg class="nav-button" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9h6V5l7 7-7 7v-4H6V9z"/></svg>`,
  PREVIOUS: `<svg class="nav-button" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15h-6v4l-7-7 7-7v4h6v6z"/></svg>`,
  SOUND_ON: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-volume-2"><path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.364 18.364a9 9 0 0 0 0-12.728"/></svg>`,
  SOUND_OFF: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-volume-x"><path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><line x1="22" x2="16" y1="9" y2="15"/><line x1="16" x2="22" y1="9" y2="15"/></svg>`,
};

const styles = {
  toolbar: {
    position: 'fixed',
    zIndex: 2147483647,
    fontFamily: MONO_FONT,
    fontSize: '13px',
    background: 'transparent',
    userSelect: 'none',
    right: '24px',
    bottom: '24px',
    display: 'flex',
    flexDirection: 'column-reverse',
    alignItems: 'flex-end',
    pointerEvents: 'none',
    maxHeight: '450px',
  },
  content: {
    background: 'rgba(0, 0, 0, 0.95)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
    display: 'flex',
    flexDirection: 'column-reverse',
    cursor: 'move',
    pointerEvents: 'auto',
    overflow: 'hidden',
    width: 'fit-content',
    minWidth: 'min-content',
    position: 'relative',
  },
  button: {
    padding: '0 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    transition: `all ${TRANSITION_MS} ease`,
    height: '100%',
    minWidth: '36px',
    outline: 'none',
  },
  navButton: {
    padding: '4px 10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    color: '#999',
    cursor: 'pointer',
    transition: `all ${TRANSITION_MS} ease`,
    height: '26px',
    outline: 'none',
    border: 'none',
    fontSize: '12px',
    whiteSpace: 'nowrap',
  },
  props: {
    pointerEvents: 'auto',
    background: '#000',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    minWidth: '100%',
    width: '360px',
    overflow: 'auto',
    maxHeight: '0',
    transition: 'max-height 500ms cubic-bezier(0, 0.95, 0.1, 1)',
  },
  resizeHandle: {
    position: 'absolute',
    left: '0',
    top: '0',
    bottom: '0',
    width: '4px',
    cursor: 'ew-resize',
    display: 'none',
  },
};

export const restoreSizeFromLocalStorage = (el: HTMLDivElement) => {
  const width = localStorage.getItem('react-scan-toolbar-width');
  el.style.width = `${width ?? 360}px`;
};

const Toolbar = () => {
  const [isActive, setIsActive] = useState(
    !ReactScanInternals.instrumentation?.isPaused,
  );
  const [isSoundOn, setIsSoundOn] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [inspectState, setInspectState] = useState(Store.inspectState.value);

  const toolbarRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({
    initialX: 0,
    initialY: 0,
    currentX: 0,
    currentY: 0,
  });
  const resizeRef = useRef({ initialWidth: 0, initialMouseX: 0 });

  useEffect(() => {
    const unsubscribe = Store.inspectState.subscribe(() => {
      setInspectState(Store.inspectState.value);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (propsRef.current) {
      restoreSizeFromLocalStorage(propsRef.current);
    }
  }, []);

  const updateToolbarPosition = useCallback((x: number, y: number) => {
    setPosition({ x, y });
  }, []);

  const ensureToolbarInBounds = useCallback(() => {
    if (!toolbarRef.current) return;

    const toolbarRect = toolbarRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const maxX = viewportWidth - toolbarRect.width - EDGE_PADDING;
    const maxY = viewportHeight - toolbarRect.height - EDGE_PADDING;

    const newX = Math.min(maxX, Math.max(EDGE_PADDING, toolbarRect.left));
    const newY = Math.min(maxY, Math.max(EDGE_PADDING, toolbarRect.top));

    const deltaX = newX - toolbarRect.left;
    const deltaY = newY - toolbarRect.top;

    if (deltaX !== 0 || deltaY !== 0) {
      dragRef.current.currentX += deltaX;
      dragRef.current.currentY += deltaY;

      toolbarRef.current.style.transition = `transform ${ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`;
      updateToolbarPosition(dragRef.current.currentX, dragRef.current.currentY);

      setTimeout(() => {
        if (toolbarRef.current) {
          toolbarRef.current.style.transition = '';
        }
      }, ANIMATION_DURATION);
    }
  }, []);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (
      e.target === document.getElementById(INSPECT_TOGGLE_ID) ||
      e.target === document.getElementById('react-scan-power') ||
      e.target === document.getElementById('react-scan-next-focus') ||
      e.target === document.getElementById('react-scan-resize-handle')
    )
      return;

    setIsDragging(true);
    const transform = new DOMMatrix(
      getComputedStyle(toolbarRef.current!).transform,
    );
    dragRef.current.currentX = transform.m41;
    dragRef.current.currentY = transform.m42;

    dragRef.current.initialX = e.clientX - dragRef.current.currentX;
    dragRef.current.initialY = e.clientY - dragRef.current.currentY;

    if (toolbarRef.current) {
      toolbarRef.current.style.transition = 'none';
    }
    e.preventDefault();
  }, []);

  const handleResizeMouseDown = useCallback((e: MouseEvent) => {
    setIsResizing(true);
    resizeRef.current.initialWidth = propsRef.current!.offsetWidth;
    resizeRef.current.initialMouseX = e.clientX;
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging) {
        const x = e.clientX - dragRef.current.initialX;
        const y = e.clientY - dragRef.current.initialY;

        dragRef.current.currentX = x;
        dragRef.current.currentY = y;
        updateToolbarPosition(x, y);
      }

      if (isResizing && propsRef.current) {
        const width =
          resizeRef.current.initialWidth -
          (e.clientX - resizeRef.current.initialMouseX);
        propsRef.current.style.width = `${Math.max(360, width)}px`;
        localStorage.setItem('react-scan-toolbar-width', String(width));
      }
    },
    [isDragging, isResizing],
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      ensureToolbarInBounds();
    }
    if (isResizing) {
      setIsResizing(false);
    }
  }, [isDragging, isResizing]);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handlePowerClick = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      const newIsActive = !isActive;
      setIsActive(newIsActive);

      const instrumentation = ReactScanInternals.instrumentation;
      if (instrumentation) {
        instrumentation.isPaused = !newIsActive;
      }
      localStorage.setItem(
        'react-scan-paused',
        String(Boolean(instrumentation?.isPaused)),
      );
    },
    [isActive],
  );

  const handleInspectClick = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    const currentState = Store.inspectState.value;

    switch (currentState.kind) {
      case 'inspecting': {
        if (propsRef.current) {
          propsRef.current.innerHTML = '';
          propsRef.current.style.maxHeight = '0';
          propsRef.current.style.width = 'fit-content';
        }

        Store.inspectState.value = {
          kind: 'inspect-off',
          propContainer: currentState.propContainer,
        };

        setTimeout(() => {
          if (Store.inspectState.value.kind === 'inspect-off') {
            Store.inspectState.value = {
              kind: 'inspect-off',
              propContainer: currentState.propContainer,
            };
          }
        }, 500);
        return;
      }
      case 'focused': {
        if (propsRef.current) {
          propsRef.current.style.maxHeight = '0';
          propsRef.current.style.width = 'fit-content';
          propsRef.current.innerHTML = '';
        }
        Store.inspectState.value = {
          kind: 'inspecting',
          hoveredDomElement: currentState.focusedDomElement,
          propContainer: currentState.propContainer,
        };
        break;
      }
      case 'inspect-off': {
        Store.inspectState.value = {
          kind: 'inspecting',
          hoveredDomElement: null,
          propContainer: propsRef.current!,
        };
        break;
      }
      case 'uninitialized': {
        Store.inspectState.value = {
          kind: 'inspect-off',
          propContainer: propsRef.current!,
        };
        break;
      }
    }
  }, []);

  const handleSoundToggle = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      setIsSoundOn(!isSoundOn);
      setOptions({ playSound: !isSoundOn });
    },
    [isSoundOn],
  );

  const handleNextFocus = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    const currentState = Store.inspectState.value;
    if (currentState.kind !== 'focused' || !currentState.focusedDomElement)
      return;

    const allElements = document.querySelectorAll('*');
    const elements = Array.from(allElements).filter(
      (el): el is HTMLElement => el instanceof HTMLElement,
    );
    const currentIndex = elements.indexOf(currentState.focusedDomElement);
    if (currentIndex === -1) return;

    let nextElement: HTMLElement | null = null;
    let nextIndex = currentIndex + 1;
    const prevFiber = getNearestFiberFromElement(
      currentState.focusedDomElement,
    );

    while (nextIndex < elements.length) {
      const fiber = getNearestFiberFromElement(elements[nextIndex]);
      if (fiber && fiber !== prevFiber) {
        nextElement = elements[nextIndex];
        break;
      }
      nextIndex++;
    }

    if (nextElement) {
      Store.inspectState.value = {
        kind: 'focused',
        focusedDomElement: nextElement,
        propContainer: currentState.propContainer,
      };
      const nextBtn = document.getElementById(
        'react-scan-next-focus',
      ) as HTMLButtonElement | null;
      if (nextBtn) {
        nextBtn.style.setProperty('--nav-opacity', '1');
        nextBtn.disabled = false;
      }
    } else {
      const nextBtn = document.getElementById(
        'react-scan-next-focus',
      ) as HTMLButtonElement | null;
      if (nextBtn) {
        nextBtn.style.setProperty('--nav-opacity', '0.5');
        nextBtn.disabled = true;
      }
    }

    const prevBtn = document.getElementById(
      'react-scan-previous-focus',
    ) as HTMLButtonElement | null;
    if (prevBtn) {
      prevBtn.style.setProperty('--nav-opacity', '1');
      prevBtn.disabled = false;
    }
  }, []);

  const handlePreviousFocus = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    const currentState = Store.inspectState.value;
    if (currentState.kind !== 'focused' || !currentState.focusedDomElement)
      return;

    const allElements = document.querySelectorAll('*');
    const elements = Array.from(allElements).filter(
      (el): el is HTMLElement => el instanceof HTMLElement,
    );
    const currentIndex = elements.indexOf(currentState.focusedDomElement);
    if (currentIndex === -1) return;

    let prevElement: HTMLElement | null = null;
    let prevIndex = currentIndex - 1;
    const currentFiber = getNearestFiberFromElement(
      currentState.focusedDomElement,
    );

    while (prevIndex >= 0) {
      const fiber = getNearestFiberFromElement(elements[prevIndex]);
      if (fiber && fiber !== currentFiber) {
        prevElement = elements[prevIndex];
        break;
      }
      prevIndex--;
    }

    if (prevElement) {
      Store.inspectState.value = {
        kind: 'focused',
        focusedDomElement: prevElement,
        propContainer: currentState.propContainer,
      };
      const prevBtn = document.getElementById(
        'react-scan-previous-focus',
      ) as HTMLButtonElement | null;
      if (prevBtn) {
        prevBtn.style.setProperty('--nav-opacity', '1');
        prevBtn.disabled = false;
      }
    } else {
      const prevBtn = document.getElementById(
        'react-scan-previous-focus',
      ) as HTMLButtonElement | null;
      if (prevBtn) {
        prevBtn.style.setProperty('--nav-opacity', '0.5');
        prevBtn.disabled = true;
      }
    }

    const nextBtn = document.getElementById(
      'react-scan-next-focus',
    ) as HTMLButtonElement | null;
    if (nextBtn) {
      nextBtn.style.setProperty('--nav-opacity', '1');
      nextBtn.disabled = false;
    }
  }, []);

  useEffect(() => {
    const handleViewportChange = () => {
      if (!isDragging && !isResizing) {
        ensureToolbarInBounds();
      }
    };

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange);

    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange);
    };
  }, [isDragging, isResizing]);

  const focusActive = inspectState.kind === 'focused';
  const isInspectActive = inspectState.kind === 'inspecting';

  return (
    <div
      ref={toolbarRef}
      id="react-scan-toolbar"
      style={{
        ...styles.toolbar,
        transform: `translate(${position.x}px, ${position.y}px)`,
      }}
    >
      <div
        ref={contentRef}
        id="react-scan-toolbar-content"
        style={styles.content}
        onMouseDown={handleMouseDown}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            height: '36px',
            width: '100%',
          }}
        >
          <button
            id={INSPECT_TOGGLE_ID}
            style={{
              ...styles.button,
              color:
                isInspectActive || focusActive
                  ? 'rgba(142, 97, 227, 1)'
                  : '#999',
            }}
            onClick={handleInspectClick}
            title="Inspect element"
            dangerouslySetInnerHTML={{
              __html: isInspectActive
                ? SVG.INSPECTING
                : focusActive
                  ? SVG.FOCUSING
                  : SVG.INSPECTING,
            }}
          />
          <button
            id="react-scan-power"
            style={{
              ...styles.button,
              color: isActive ? '#fff' : '#999',
            }}
            onClick={handlePowerClick}
            title={isActive ? 'Stop' : 'Start'}
            dangerouslySetInnerHTML={{
              __html: isActive ? SVG.PAUSE : SVG.PLAY,
            }}
          />
          <button
            id="react-scan-sound-toggle"
            style={{
              ...styles.button,
              color: isSoundOn ? '#fff' : '#999',
            }}
            onClick={handleSoundToggle}
            title={isSoundOn ? 'Sound On' : 'Sound Off'}
            dangerouslySetInnerHTML={{
              __html: isSoundOn ? SVG.SOUND_ON : SVG.SOUND_OFF,
            }}
          />
          <div
            style={{
              padding: '0 12px',
              color: '#fff',
              borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              height: '100%',
              flex: 1,
              justifyContent: 'space-evenly',
            }}
          >
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {focusActive && (
                <>
                  <button
                    id="react-scan-previous-focus"
                    style={styles.navButton}
                    onClick={handlePreviousFocus}
                    dangerouslySetInnerHTML={{ __html: SVG.PREVIOUS }}
                  />
                  <button
                    id="react-scan-next-focus"
                    style={styles.navButton}
                    onClick={handleNextFocus}
                    dangerouslySetInnerHTML={{ __html: SVG.NEXT }}
                  />
                </>
              )}
              <span style={{ fontSize: '14px', fontWeight: 500 }}>
                react-scan
              </span>
            </div>
          </div>
        </div>
        <div
          ref={propsRef}
          id="react-scan-props"
          style={{
            ...styles.props,
            maxHeight: isInspectActive || focusActive ? '450px' : '0',
          }}
        />
        <div
          id="react-scan-resize-handle"
          style={{
            ...styles.resizeHandle,
            display: focusActive ? 'block' : 'none',
          }}
          onMouseDown={handleResizeMouseDown}
        />
      </div>
    </div>
  );
};

export const createToolbar = () => {
  if (typeof window === 'undefined') {
    return {
      cleanup: () => {
        /**/
      },
    };
  }

  const styleElement = document.createElement('style');
  styleElement.textContent = `
    #react-scan-toolbar {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }

    .react-scan-inspector {
      font-size: 13px;
      width: 360px;
      color: #fff;
      width: 100%;
    }

    .react-scan-header {
      padding: 8px 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      gap: 8px;
      align-items: center;
      justify-content: space-between;
      background: #000;
    }

    .react-scan-header-left {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .react-scan-header-right {
      display: flex;
      gap: 4px;
      align-items: center;
    }

    .react-scan-replay-button {
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      border-radius: 4px;
      color: #fff;
      cursor: pointer;
      transition: all ${TRANSITION_MS} ease;
      outline: none;
    }

    .react-scan-replay-button:hover {
      background: rgba(255, 255, 255, 0.15);
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

    .react-scan-warning {
      padding-right: 4px;
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

    .react-scan-input {
      background: #000;
      border: none;
      color: #fff;
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
      display: flex;
      align-items: center;
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

    #react-scan-toolbar::-webkit-scrollbar {
      width: 4px;
      height: 4px;
    }

    #react-scan-toolbar::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
    }

    #react-scan-toolbar::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.3);
      border-radius: 4px;
    }

    #react-scan-toolbar::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.4);
    }

    /* For Firefox */
    #react-scan-toolbar * {
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.3) rgba(255, 255, 255, 0.1);
    }

    .nav-button {
      opacity: var(--nav-opacity, 1);
    }
  `;

  if (document.head) document.head.appendChild(styleElement);

  const existing = document.getElementById('react-scan-toolbar');
  if (existing) existing.remove();

  const container = document.createElement('div');
  document.documentElement.appendChild(container);

  render(<Toolbar />, container);

  Store.inspectState.value = {
    kind: 'inspect-off',
    propContainer: document.getElementById(
      'react-scan-props',
    ) as HTMLDivElement,
  };

  return () => {
    render(null, container);
    document.documentElement.removeChild(container);
    styleElement.remove();
  };
};
