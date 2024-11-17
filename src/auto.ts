import './core/instrumentation/placeholder';
import { scan } from './index';

if (typeof window !== 'undefined') {
  scan({ runInProduction: true });
  window.reactScan = scan;
}

export * from './index';
