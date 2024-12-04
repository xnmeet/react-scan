import { Store } from '../..';
import type { Interaction } from './types';
import { generateId } from './utils';

export function initPerformanceMonitoring() {
  if (!window.PerformanceObserver) return;

  const observer = new PerformanceObserver((list) => {
    const monitor = Store.monitor.value;
    if (!monitor) return;

    const entries = list.getEntries();
    const interactionIds = new Set<number>();
    for (let i = 0, len = entries.length; i < len; i++) {
      const entry = entries[i] as PerformanceEventTiming & {
        interactionId?: number;
      };
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      if (!(entry.interactionId || entry.entryType === 'first-input')) continue;
      else if (entry.interactionId && interactionIds.has(entry.interactionId))
        continue;
      interactionIds.add(entry.interactionId!);

      const interaction: Interaction = {
        id: generateId(),
        name: entry.name,
        type: entry.name,
        time: entry.duration,
        timestamp: entry.startTime,
      };

      monitor.interactions.push(interaction);
    }
  });

  observer.observe({
    entryTypes: ['event', 'first-input'],
    buffered: true,
  });

  return observer;
}
