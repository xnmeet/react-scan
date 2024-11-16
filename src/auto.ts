import { scan } from './index';

if (typeof window !== 'undefined') {
  scan({ production: true });
  window.reactScan = scan;
}

export * from './index';
