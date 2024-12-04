import { Fiber } from 'react-reconciler';
import { Store } from '../..';
import { getDisplayName } from '../instrumentation/utils';
import { getNearestFiberFromElement } from '../web/inspect-element/utils';
import type { Interaction } from './types';
import { generateId } from './utils';

interface PathFilters {
  skipProviders: boolean;
  skipHocs: boolean;
  skipContainers: boolean;
  skipMinified: boolean;
  skipUtilities: boolean;
  skipBoundaries: boolean;
}

const DEFAULT_FILTERS: PathFilters = {
  skipProviders: true,
  skipHocs: true,
  skipContainers: true,
  skipMinified: true,
  skipUtilities: true,
  skipBoundaries: true,
};

const FILTER_PATTERNS = {
  providers: [
    /Provider$/,
    /^Provider$/,
    /Context$/,
    /ContextProvider/,
    /ParamsContext/,
    /RouterContext/,
    /ConfigContext/,
  ],

  hocs: [/^with[A-Z]/, /^forward(Ref)?$/i, /^Forward(Ref)?\(/],

  containers: [/^(App)?Container$/, /^Root$/, /^ReactDev/],

  utilities: [
    /^Fragment$/,
    /^Suspense$/,
    /^ErrorBoundary$/,
    /^Portal$/,
    /^Consumer$/,
    /^Layout$/,
    /^Adapter$/,
    /^Router/,
    /^Hydration/,
  ],

  boundaries: [
    /^Boundary$/,
    /Boundary$/,
    /^Adapter$/,
    /Adapter$/,
    /^Provider$/,
    /Provider$/,
  ],
};

function shouldIncludeInPath(
  name: string,
  filters: PathFilters = DEFAULT_FILTERS,
): boolean {
  const patternsToCheck: RegExp[] = [];

  if (filters.skipProviders) patternsToCheck.push(...FILTER_PATTERNS.providers);
  if (filters.skipHocs) patternsToCheck.push(...FILTER_PATTERNS.hocs);
  if (filters.skipContainers)
    patternsToCheck.push(...FILTER_PATTERNS.containers);
  if (filters.skipUtilities) patternsToCheck.push(...FILTER_PATTERNS.utilities);
  if (filters.skipBoundaries)
    patternsToCheck.push(...FILTER_PATTERNS.boundaries);

  return !patternsToCheck.some((pattern) => pattern.test(name));
}

function getInteractionPath(
  fiber: Fiber | null,
  filters: PathFilters = DEFAULT_FILTERS,
): string {
  if (!fiber) return '';

  const fullPath: string[] = [];
  let current: Fiber | null = fiber;

  while (current) {
    if (current.type && typeof current.type === 'function') {
      const name = getCleanComponentName(current.type);
      if (name) {
        fullPath.unshift(name);
      }
    }
    current = current.return;
  }

  const filteredPath = fullPath.filter(
    (name) =>
      name.length > 2 && // todo: option for minified
      shouldIncludeInPath(name, filters),
  );

  return normalizePath(filteredPath);
}

function getCleanComponentName(component: any): string {
  const name = getDisplayName(component);
  if (!name) return '';

  return name.replace(/^(Memo|Forward(Ref)?|With.*?)\((.*?)\)$/, '$3');
}

function normalizePath(path: string[]): string {
  const cleaned = path.filter(Boolean);

  const deduped = cleaned.filter((name, i) => name !== cleaned[i - 1]);

  return deduped.join(' → ');
}

export function initPerformanceMonitoring(options?: Partial<PathFilters>) {
  const filters = { ...DEFAULT_FILTERS, ...options };
  const monitor = Store.monitor.value;
  if (!monitor) return;

  const createInteraction = (
    event: PointerEvent | Event | KeyboardEvent,
  ): Interaction | null => {
    let element: HTMLElement | null = null;

    if (event instanceof PointerEvent) {
      element = event.target as any;
    } else if (event instanceof KeyboardEvent) {
      element = document.activeElement as HTMLElement;
    } else {
      element = event.target as HTMLElement;
    }

    if (!element) {
      return null;
    }

    const fiber = getNearestFiberFromElement(element);
    // const path = getInteractionPath(fiber, filters);
    return {
      id: generateId(),
      name: event.type,
      comoponentName: fiber?.type
        ? (getDisplayName(fiber?.type) ?? 'Unknown')
        : 'Unknown', // dont send events if we have no name?
      type: event.type,
      path: getInteractionPath(fiber, filters),
      time: 0,
      timestamp: Date.now(),
    };
  };

  const handlers = {
    click: (event: MouseEvent) => {
      const interaction = createInteraction(event);
      if (!interaction) {
        return;
      }

      monitor.interactions.push(interaction);
    },

    scroll: (() => {
      let scrollTimeout: number;
      let scrollStart: number;
      let currentInteraction: Interaction | null = null;

      return (event: Event) => {
        if (!currentInteraction) {
          scrollStart = performance.now();
          const interaction = createInteraction(event);
          if (!interaction) return;
          currentInteraction = interaction;
          monitor.interactions.push(interaction);
        }

        // Clear existing timeout
        window.clearTimeout(scrollTimeout);

        // Set new timeout
        scrollTimeout = window.setTimeout(() => {
          if (currentInteraction) {
            currentInteraction.time = performance.now() - scrollStart;
            currentInteraction = null;
          }
        }, 150); // Debounce scroll end
      };
    })(),

    keydown: (() => {
      let typingTimeout: number;
      let typingStart: number;
      let currentInteraction: Interaction | null = null;

      return (event: KeyboardEvent) => {
        if (!currentInteraction) {
          typingStart = performance.now();

          const interaction = createInteraction(event);
          if (!interaction) return;
          currentInteraction = interaction;
          monitor.interactions.push(interaction);
        }

        // Clear existing timeout
        window.clearTimeout(typingTimeout);

        // Set new timeout
        typingTimeout = window.setTimeout(() => {
          if (currentInteraction) {
            currentInteraction.time = performance.now() - typingStart;
            currentInteraction = null;
          }
        }, 500); // Debounce typing end
      };
    })(),
  };

  // Add event listeners
  window.addEventListener('click', handlers.click);
  window.addEventListener('scroll', handlers.scroll, { passive: true });
  window.addEventListener('keydown', handlers.keydown);

  // Return cleanup function
  return () => {
    window.removeEventListener('click', handlers.click);
    window.removeEventListener('scroll', handlers.scroll);
    window.removeEventListener('keydown', handlers.keydown);
  };
}
