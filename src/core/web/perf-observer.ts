import { ReactScanInternals } from '../../index';
import { NO_OP } from '../utils';
import { colorRef } from './outline';

export const createPerfObserver = () => {
  const observer = new PerformanceObserver(NO_OP);

  observer.observe({ entryTypes: ['longtask'] });

  return observer;
};

export const recalcOutlineColor = (entries: PerformanceEntryList) => {
  const { longTaskThreshold } = ReactScanInternals.options;
  for (let i = 0, len = entries.length; i < len; i++) {
    const entry = entries[i];
    // 64ms = 4 frames
    // If longTaskThreshold is set, we show all "short" tasks, otherwise we hide them
    if (entry.duration < (longTaskThreshold ?? 50)) continue;
    colorRef.current = '185,49,115';
    return;
  }
  colorRef.current = '115,97,230';
};
