import {
  getAllFiberContexts,
  getChangedProps,
  getChangedState,
  getStateFromFiber,
} from './utils';

let prevChangedProps = new Set<string>();
let prevChangedState = new Set<string>();

const EXPANDED_PATHS = new Set<string>();
const fadeOutTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();

export const renderPropsAndState = (
  didRender: boolean,
  fiber: any,
  reportDataFiber: any,
  propsContainer: HTMLDivElement,
) => {
  const fiberContext = Array.from(getAllFiberContexts(fiber).entries()).map(
    (x) => x[1],
  );

  const componentName =
    fiber.type?.displayName || fiber.type?.name || 'Unknown';
  const props = fiber.memoizedProps || {};
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

  if (Object.values(props).length) {
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
  }
  if (Object.values(state).length) {
    content.appendChild(
      renderSection(
        didRender,
        propsContainer,
        'State',
        Object.values(state),
        changedState,
        prevChangedState,
      ),
    );
  }
  if (fiberContext.length) {
    content.appendChild(
      renderSection(
        didRender,
        propsContainer,
        'Context',
        fiberContext,
        // todo: detect changed context
      ),
    );
  }

  inspector.appendChild(content);
  propsContainer.appendChild(inspector);

  prevChangedProps = changedProps;
  prevChangedState = changedState;

  requestAnimationFrame(() => {
    const contentHeight = inspector.getBoundingClientRect().height;
    propsContainer.style.maxHeight = `${contentHeight}px`;
  });
};

const renderSection = (
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
        '',
        new WeakMap(),
      ),
    );
  });

  return section;
};

const getPath = (section: string, parentPath: string, key: string) => {
  return parentPath ? `${parentPath}.${key}` : `${section}.${key}`;
};
export const changedAt = new Map<string, number>();

let changedAtInterval: ReturnType<typeof setInterval>;
let lastRendered = new Map<string, unknown>();

export const createPropertyElement = (
  didRender: boolean,
  propsContainer: HTMLDivElement,
  key: string,
  value: any,
  section = '',
  level = 0,
  changedKeys: Set<string> = new Set(),
  parentPath = '',
  objectPathMap: WeakMap<object, Set<string>> = new WeakMap(),
) => {
  if (!changedAtInterval) {
    changedAtInterval = setInterval(() => {
      changedAt.forEach((value, key) => {
        if (Date.now() - value > 450) {
          // delete old animations
          changedAt.delete(key);
        }
      });
    }, 200);
  }
  const container = document.createElement('div');
  container.className = 'react-scan-property';

  const isExpandable =
    (typeof value === 'object' && value !== null) || Array.isArray(value);
  const currentPath = getPath(section, parentPath, key);
  if (isExpandable) {
    const isExpanded = EXPANDED_PATHS.has(currentPath);

    if (typeof value === 'object' && value !== null) {
      let paths = objectPathMap.get(value);
      if (!paths) {
        paths = new Set();
        objectPathMap.set(value, paths);
      }
      if (paths.has(currentPath)) {
        // Circular reference detected
        return createCircularReferenceElement(key, currentPath);
      }
      paths.add(currentPath);
    }

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

    contentWrapper.appendChild(preview);
    contentWrapper.appendChild(content);
    container.appendChild(contentWrapper);

    // Only create nested content if expanded
    if (isExpanded) {
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
              objectPathMap,
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
              objectPathMap,
            ),
          );
        });
      }
    }

    arrow.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanding = !container.classList.contains('react-scan-expanded');

      if (isExpanding) {
        EXPANDED_PATHS.add(currentPath);
        container.classList.add('react-scan-expanded');
        content.classList.remove('react-scan-hidden');

        if (!content.hasChildNodes()) {
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
                  new WeakMap(),
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
                  new WeakMap(),
                ),
              );
            });
          }
        }
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

  const isChanged =
    lastRendered.get(currentPath) !== undefined && // using the last rendered value is the most reliable during frequent updates than any fiber tree check
    lastRendered.get(currentPath) !== value;

  lastRendered.set(currentPath, value);

  if (isChanged) {
    changedAt.set(currentPath, Date.now());
  }
  if (changedKeys.has(key)) {
    changedAt.set(currentPath, Date.now());
  }
  if (changedAt.has(currentPath)) {
    const flashOverlay = document.createElement('div');
    flashOverlay.className = 'react-scan-flash-overlay';
    container.appendChild(flashOverlay);

    // If it's already flashing set opacity back to peak
    flashOverlay.style.opacity = '.9';

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

const createCircularReferenceElement = (key: string, path: string) => {
  const container = document.createElement('div');
  container.className = 'react-scan-property';

  const preview = document.createElement('div');
  preview.className = 'react-scan-preview-line';
  preview.innerHTML = `
    <span style="width: 8px; display: inline-block"></span>
    <span class="react-scan-key">${key}</span>: <span class="react-scan-circular">[Circular Reference]</span>
  `;
  container.appendChild(preview);
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

const hasFlashOverlay = (element: HTMLElement) => {
  return element.querySelector('.react-scan-flash-overlay') !== null;
};
