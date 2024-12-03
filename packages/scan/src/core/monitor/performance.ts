import { Store } from '../..';
import type { Interaction } from './types';
import { generateId } from './utils';

export function initPerformanceMonitoring() {
  if (!window.PerformanceObserver) return;

  const observer = new PerformanceObserver((list) => {
    const monitor = Store.monitor.value;
    if (!monitor) return;

    list.getEntries().forEach((entry) => {
      if (entry.entryType === 'interaction') {
        const eventTiming = entry as PerformanceEventTiming;
        const interaction: Interaction = {
          id: generateId(),
          name: eventTiming.name,
          type: eventTiming.name,
          time: eventTiming.duration,
          timestamp: eventTiming.startTime,
        };

        monitor.interactions.push(interaction);
      }
    });
  });

  observer.observe({
    entryTypes: ['interaction'],
  });
}
