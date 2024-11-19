import { ReactScanInternals } from '../../index';
import { NO_OP } from '../utils';
import { colorRef } from './outline';

export const createPerfObserver = () => {
  const observer = new PerformanceObserver(NO_OP);

  observer.observe({ entryTypes: ['measure'] });

  return observer;
};

export const recalcOutlineColor = (entries: PerformanceEntryList) => {
  const { longTaskThreshold } = ReactScanInternals.options;
  const minDuration = longTaskThreshold ?? 1;
  const maxDuration = 1000;

  let maxDurationFound = 0;

  for (let i = 0, len = entries.length; i < len; i++) {
    const duration = entries[i].duration;
    if (duration > maxDurationFound) {
      maxDurationFound = duration;
    }
  }

  if (maxDurationFound > minDuration) {
    const t = Math.min(
      Math.max(
        (maxDurationFound - minDuration) / (maxDuration - minDuration),
        0,
      ),
      1,
    );

    const startColor = { r: 115, g: 97, b: 230 }; // Base color
    const endColor = { r: 185, g: 49, b: 115 }; // Color for longest tasks

    const r = Math.round(startColor.r + t * (endColor.r - startColor.r));
    const g = Math.round(startColor.g + t * (endColor.g - startColor.g));
    const b = Math.round(startColor.b + t * (endColor.b - startColor.b));

    colorRef.current = `${r},${g},${b}`;
  } else {
    colorRef.current = '115,97,230'; // Default color when there are no significant entries
  }
};
