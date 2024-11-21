let isBlocked = false;

export const isMainThreadBlocked = () => isBlocked;

export const createPerfObserver = () => {
  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    for (let i = 0, len = entries.length; i < len; i++) {
      const entry = entries[i];
      if (entry.duration > 0) {
        isBlocked = true;
        return;
      }
    }
    isBlocked = false;
  });

  observer.observe({ entryTypes: ['longtask'] });

  return observer;
};
