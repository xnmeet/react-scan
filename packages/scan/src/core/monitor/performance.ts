import { Store } from '../..';
import type { Interaction } from './types';
import { generateId } from './utils';

export function initPerformanceMonitoring() {
  const monitor = Store.monitor.value;
  if (!monitor) return;

  const createInteraction = (event: Event): Interaction => ({
    id: generateId(),
    name: event.type,
    type: event.type,
    time: 0, // We'll update this when the interaction "ends"
    timestamp: Date.now(),
  });

  const handlers = {
    click: (event: MouseEvent) => {
      const interaction = createInteraction(event);
      monitor.interactions.push(interaction);
    },

    scroll: (() => {
      let scrollTimeout: number;
      let scrollStart: number;
      let currentInteraction: Interaction | null = null;

      return (event: Event) => {
        if (!currentInteraction) {
          scrollStart = performance.now();
          currentInteraction = createInteraction(event);
          monitor.interactions.push(currentInteraction);
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
          currentInteraction = createInteraction(event);
          monitor.interactions.push(currentInteraction);
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
