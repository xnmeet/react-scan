import { Fiber } from 'react-reconciler';
import { Store } from '../..';
import { getDisplayName } from '../instrumentation/utils';
import { getCompositeComponentFromElement } from '../web/inspect-element/utils';
import type {
  PerformanceInteraction,
  PerformanceInteractionEntry,
} from './types';
import { logger } from '../utils';

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
  providers: [/Provider$/, /^Provider$/, /^Context$/],

  hocs: [/^with[A-Z]/, /^forward(Ref)?$/i, /^Forward(Ref)?\(/],

  containers: [/^(App)?Container$/, /^Root$/, /^ReactDev/],

  utilities: [
    /^Fragment$/,
    /^Suspense$/,
    /^ErrorBoundary$/,
    /^Portal$/,
    /^Consumer$/,
    /^Layout$/,
    /^Router/,
    /^Hydration/,
  ],

  boundaries: [/^Boundary$/, /Boundary$/, /^Provider$/, /Provider$/],
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

const interactionPathCache = new WeakMap<Fiber, string>();
// todo: cache like this:
/**
 * 
 * @param fiber Rob
  4:06 AM
@Aiden Bai
i need a cache validation strategy for a function that gets the path from current fiber to root
I think i can always hit cache if the element does not have a key associated with it, is that correct? Meaning the only way the ancestor of a node gets changed is if a user manually adds a key to an element and it gets placed in a new subtree (edited) 
4:06
oh wait no
4:06
if any ancestors have a key
4:06
ug


Aiden Bai
:headphones:  4:06 AM
key?
4:06
like key=“”


Rob
  4:07 AM
like imagine
if (Math.random() > .5){
return <PArenta> <ComponentA key=a/> </>
}else{
return <ParentB> <ComponentA key=“a”/> </>} (edited) 
4:07
the ancestor changes and the fiber doesn’t get re-created
4:08
but if the element and all ancestors don’t have a key it should never change

 */
export function getInteractionPath(
  fiber: Fiber | null,
  filters: PathFilters = DEFAULT_FILTERS,
): string {
  if (!fiber) return '';

  const fullPath: string[] = [];

  const currentName = getDisplayName(fiber.type);
  if (currentName) {
    fullPath.unshift(currentName);
  }

  let current = fiber.return;
  while (current) {
    if (current.type && typeof current.type === 'function') {
      const name = getCleanComponentName(current.type);
      if (name && name.length > 2 && shouldIncludeInPath(name, filters)) {
        fullPath.unshift(name);
      }
    }
    current = current.return;
  }

  const normalized = normalizePath(fullPath);
  return normalized;
}

let currentMouseOver: Element;

function getCleanComponentName(component: any): string {
  const name = getDisplayName(component);
  if (!name) return '';

  return name.replace(/^(Memo|Forward(Ref)?|With.*?)\((.*?)\)$/, '$3');
}

function normalizePath(path: string[]): string {
  const cleaned = path.filter(Boolean);

  const deduped = cleaned.filter((name, i) => name !== cleaned[i - 1]);

  return deduped.join('.');
}

export function initPerformanceMonitoring(options?: Partial<PathFilters>) {
  // todo: expose filters to user
  const filters = { ...DEFAULT_FILTERS, ...options };
  const monitor = Store.monitor.value;
  if (!monitor) return;

  document.addEventListener('mouseover', (event) => {

    if (!(event.target instanceof Element)) {
      return;
    }
    currentMouseOver = event.target;
  });
  // todo: unsub
  setupPerformanceListener((entry) => {

    // console.log('entry', entry);

    let target =
      entry.target ?? (entry.type === 'pointer' ? currentMouseOver : null);
    if (!target) {
      return;
    }
    let { parentCompositeFiber } = getCompositeComponentFromElement(target);
    if (parentCompositeFiber && !getDisplayName(parentCompositeFiber?.type)) {
      parentCompositeFiber = undefined; // so bad clean this up
    }
    while (!parentCompositeFiber && target.parentElement) {
      target = target.parentElement;

      const { parentCompositeFiber: fiber } =
        getCompositeComponentFromElement(target);

      if (!fiber) {
        continue;
      }
      if (getDisplayName(fiber?.type)) {
        parentCompositeFiber = fiber;
      }
    }

    if (!parentCompositeFiber) {
      return;
    }
    const displayName = getDisplayName(parentCompositeFiber.type);
    if (!displayName) {
      return;
    }

    if (!entry.type) {
      return;
    }

    const path = getInteractionPath(parentCompositeFiber, filters);

    monitor.interactions.push({
      componentName: displayName,
      componentPath: path,
      performanceEntry: entry, // todo: remove entries
      components: new Map(),
      route: Store.monitor.value?.route ?? null,
      url: window.location.toString(),
    });
    logger.debug('current interactions', monitor.interactions);
  });
}

const setupPerformanceListener = (
  onEntry: (interaction: PerformanceInteraction) => void,
) => {
  const longestInteractionList: PerformanceInteraction[] = [];
  const longestInteractionMap = new Map<string, PerformanceInteraction>();
  const interactionTargetMap = new Map<string, Element>();

  const processInteractionEntry = (entry: PerformanceInteractionEntry) => {
    if (!(entry.interactionId || entry.entryType === 'first-input')) return;

    if (
      entry.interactionId &&
      entry.target &&
      !interactionTargetMap.has(entry.interactionId)
    ) {
      interactionTargetMap.set(entry.interactionId, entry.target);
    }

    const existingInteraction = longestInteractionMap.get(entry.interactionId);

    if (existingInteraction) {
      if (entry.duration > existingInteraction.latency) {
        existingInteraction.entries = [entry];
        existingInteraction.latency = entry.duration;
      } else if (
        entry.duration === existingInteraction.latency &&
        entry.startTime === existingInteraction.entries[0].startTime
      ) {
        existingInteraction.entries.push(entry);
      }
    } else {
      const interactionType = getInteractionType(entry.name);
      if (!interactionType) {
        logger.debug('dev invariant: invalid interaction type');

        return;
      }
      const interaction: PerformanceInteraction = {
        id: entry.interactionId,
        latency: entry.duration,
        entries: [entry], // todo: make this a global map: array, dont store on object since we will send this obj through flush
        target: entry.target,
        type: interactionType,
        startTime: entry.startTime,
        processingStart: entry.processingStart,
        processingEnd: entry.processingEnd,
        duration: entry.duration,
        inputDelay: entry.processingStart - entry.startTime,
        processingDuration: entry.processingEnd - entry.processingStart,
        presentationDelay:
          entry.duration - (entry.processingEnd - entry.startTime),
        timestamp: Date.now(),
      };
      longestInteractionMap.set(interaction.id, interaction);
      longestInteractionList.push(interaction);
      // console.log('true entry', entry);

      onEntry(interaction);
    }

    longestInteractionList.sort((a, b) => b.latency - a.latency);
  };

  const getInteractionType = (
    eventName: string,
  ): 'pointer' | 'keyboard' | null => {
    if (['pointerdown', 'pointerup', 'click'].includes(eventName)) {
      return 'pointer';
    }
    if (['keydown', 'keyup'].includes(eventName)) {
      return 'keyboard';
    }
    return null;
  };

  const po = new PerformanceObserver((list) => {
    list
      .getEntries()
      .forEach((entry) =>
        processInteractionEntry(entry as PerformanceInteractionEntry),
      );
  });

  try {
    po.observe({
      type: 'event',
      buffered: true,
      durationThreshold: 16,
    } as PerformanceObserverInit);
    po.observe({
      type: 'first-input',
      buffered: true,
    });
  } catch (e) {
    console.error('Failed to initialize observers:', e);
  }

  (window as any).getInteractions = () => longestInteractionList;
};
