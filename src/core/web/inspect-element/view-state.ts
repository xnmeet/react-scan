import { getChangedProps, getChangedState, getStateFromFiber } from './utils';

// exists for animations, this is not a replacement for fiber.alternate.memoizedState/memoizedProps
let prevChangedProps = new Set<string>();
let prevChangedState = new Set<string>();

export const renderPropsAndState = (
  didRender: boolean, // this may be called even when the component did not render, so this is necessary information
  fiber: any,
  reportDataFiber: any,
  propsContainer: HTMLDivElement,
) => {
  const componentName =
    fiber.type?.displayName || fiber.type?.name || 'Unknown';
  const props = fiber.pendingProps || {};
  const state = getStateFromFiber(fiber) || {};

  const renderCount = reportDataFiber?.count || 0;
  const renderTime = reportDataFiber?.time?.toFixed(2) || '0';

  const changedProps = new Set(getChangedProps(fiber));
  const changedState = new Set(getChangedState(fiber));
  propsContainer.innerHTML = '';

  const inspector = document.createElement('div');
  inspector.className = 'react-scan-inspector';

  const header = document.createElement('div');
  header.className = 'react-scan-header';
  header.innerHTML = `
    <span class="react-scan-component-name">${componentName}</span>
    <span class="react-scan-metrics">${renderCount} renders • ${renderTime}ms</span>
  `;
  inspector.appendChild(header);

  const content = document.createElement('div');
  content.className = 'react-scan-content';

  content.appendChild(
    renderSection(
      didRender,
      propsContainer,
      'Props',
      props,
      changedProps,
      prevChangedProps,
    ),
  );
  content.appendChild(
    renderSection(
      didRender,
      propsContainer,
      'State',
      state,
      changedState,
      prevChangedState,
    ),
  );

  inspector.appendChild(content);
  propsContainer.appendChild(inspector);

  prevChangedProps = changedProps;
  prevChangedState = changedState;

  requestAnimationFrame(() => {
    const contentHeight = inspector.getBoundingClientRect().height;
    propsContainer.style.maxHeight = `${contentHeight}px`;
  });
};

export const renderSection = (
  didRender: boolean,
  propsContainer: HTMLDivElement,
  title: string,
  data: any,
  changedKeys: Set<string> = new Set(),
  prevChangedKeys: Set<string> = new Set(),
) => {
  const section = document.createElement('div');
  section.className = 'react-scan-section';
  section.textContent = title;

  Object.entries(data).forEach(([key, value]) => {
    section.appendChild(
      createPropertyElement(
        didRender,
        propsContainer,
        key,
        value,
        title.toLowerCase(),
        0,
        changedKeys,
      ),
    );
  });

  return section;
};
const getPath = (section: string, parentPath: string, key: string) => {
  return parentPath ? `${parentPath}.${key}` : `${section}.${key}`;
};
const fadeOutTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();
const EXPANDED_PATHS = new Set<string>();

export const createPropertyElement = (
  didRender: boolean,
  propsContainer: HTMLDivElement,
  key: string,
  value: any,
  section = '',
  level = 0,
  changedKeys: Set<string> = new Set(),
  parentPath = '',
) => {
  const container = document.createElement('div');
  container.className = 'react-scan-property';

  const isExpandable =
    (typeof value === 'object' && value !== null) || Array.isArray(value);

  if (isExpandable) {
    const currentPath = getPath(section, parentPath, key);
    const isExpanded = EXPANDED_PATHS.has(currentPath);

    container.classList.add('react-scan-expandable');
    if (isExpanded) {
      container.classList.add('react-scan-expanded');
    }
    const arrow = document.createElement('span');
    arrow.className = 'react-scan-arrow';
    arrow.textContent = '▶';
    container.appendChild(arrow);

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'react-scan-property-content';

    const preview = document.createElement('div');
    preview.className = 'react-scan-preview-line';
    preview.dataset.key = key;
    preview.dataset.section = section;
    preview.innerHTML = `
        <span class="react-scan-key">${key}</span>: <span class="${getValueClassName(
          value,
        )}">${getValuePreview(value)}</span>
      `;

    const content = document.createElement('div');
    content.className = isExpanded
      ? 'react-scan-nested-object'
      : 'react-scan-nested-object react-scan-hidden';

    if (Array.isArray(value)) {
      const arrayContainer = document.createElement('div');
      arrayContainer.className = 'react-scan-array-container';
      value.forEach((item, index) => {
        arrayContainer.appendChild(
          createPropertyElement(
            didRender,
            propsContainer,
            index.toString(),
            item,
            section,
            level + 1,
            changedKeys,
            currentPath,
          ),
        );
      });
      content.appendChild(arrayContainer);
    } else {
      Object.entries(value).forEach(([k, v]) => {
        content.appendChild(
          createPropertyElement(
            didRender,
            propsContainer,
            k,
            v,
            section,
            level + 1,
            changedKeys,
            currentPath,
          ),
        );
      });
    }

    contentWrapper.appendChild(preview);
    contentWrapper.appendChild(content);
    container.appendChild(contentWrapper);

    container.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanding = !container.classList.contains('react-scan-expanded');

      if (isExpanding) {
        EXPANDED_PATHS.add(currentPath);
        container.classList.add('react-scan-expanded');
        content.classList.remove('react-scan-hidden');
      } else {
        EXPANDED_PATHS.delete(currentPath);
        container.classList.remove('react-scan-expanded');
        content.classList.add('react-scan-hidden');
      }

      requestAnimationFrame(() => {
        const inspector = propsContainer.firstElementChild as HTMLElement;
        if (inspector) {
          const contentHeight = inspector.getBoundingClientRect().height;
          propsContainer.style.maxHeight = `${contentHeight}px`;
        }
      });
    });
  } else {
    const preview = document.createElement('div');
    preview.className = 'react-scan-preview-line';
    preview.dataset.key = key;
    preview.dataset.section = section;
    preview.innerHTML = `
        <span style="width: 8px; display: inline-block"></span>
        <span class="react-scan-key">${key}</span>: <span class="${getValueClassName(
          value,
        )}">${getValuePreview(value)}</span>
      `;
    container.appendChild(preview);
  }

  const isChanged = changedKeys.has(key) && didRender;

  const flashOverlay = document.createElement('div');
  flashOverlay.className = 'react-scan-flash-overlay';
  container.appendChild(flashOverlay);

  if (isChanged) {
    // If it's already flashing set opacity back to peak
    flashOverlay.style.opacity = '0.5';

    const existingTimer = fadeOutTimers.get(flashOverlay);
    if (existingTimer !== undefined) {
      clearTimeout(existingTimer);
    }

    const timerId = setTimeout(() => {
      flashOverlay.style.transition = 'opacity 400ms ease-out';
      flashOverlay.style.opacity = '0';
      fadeOutTimers.delete(flashOverlay);
    }, 300);

    fadeOutTimers.set(flashOverlay, timerId);
  }

  return container;
};

export const getValueClassName = (value: any) => {
  if (Array.isArray(value)) return 'react-scan-array';
  if (value === null || value === undefined) return 'react-scan-null';
  switch (typeof value) {
    case 'string':
      return 'react-scan-string';
    case 'number':
      return 'react-scan-number';
    case 'boolean':
      return 'react-scan-boolean';
    case 'object':
      return 'react-scan-object-key';
    default:
      return '';
  }
};
export const getValuePreview = (value: any) => {
  if (Array.isArray(value)) {
    return `Array(${value.length})`;
  }
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  switch (typeof value) {
    case 'string':
      return `"${value}"`;
    case 'number':
      return value.toString();
    case 'boolean':
      return value.toString();
    case 'object': {
      const keys = Object.keys(value);
      if (keys.length <= 3) {
        return `{${keys.join(', ')}}`;
      }
      return `{${keys.slice(0, 3).join(', ')}, ...}`;
    }
    default:
      return typeof value;
  }
};
