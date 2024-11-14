import type { ScanOptions, WithScanOptions } from './types';

export const MONO_FONT =
  'Menlo,Consolas,Monaco,Liberation Mono,Lucida Console,monospace';
export const PURPLE_RGB = '115,97,230';
export const GREEN_RGB = '33,203,110';

export const PerformedWorkFlag = 0b01;
export const ClassComponentTag = 1;
export const FunctionComponentTag = 0;
export const ContextConsumerTag = 9;
export const ForwardRefTag = 11;
export const MemoComponentTag = 14;
export const SimpleMemoComponentTag = 15;

export const DEFAULT_OPTIONS: ScanOptions & WithScanOptions = {
  enabled: true,
  includeChildren: true,
  log: false,
  clearLog: false,
};
