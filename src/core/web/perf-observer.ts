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
  const minDuration = longTaskThreshold ?? 50;

  let maxDurationFound = 0;

  for (let i = 0, len = entries.length; i < len; i++) {
    const duration = entries[i].duration;
    if (duration > maxDurationFound) {
      maxDurationFound = duration;
    }
  }

  colorRef.current =
    maxDurationFound > minDuration ? '185,49,115' : '115,97,230';
};
