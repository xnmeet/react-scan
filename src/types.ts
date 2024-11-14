export interface Outline {
  rect: DOMRect;
  names: Set<string>;
  totalTime: number;
  selfTime: number;
  count: number;
  trigger: boolean;
  unstable?: boolean;
  forget?: boolean;
  prevChangedProps?: Record<string, any> | null;
  nextChangedProps?: Record<string, any> | null;
}

export interface OutlineLabel {
  alpha: number;
  outline: Outline;
  text: string | null;
}

export interface ChangedProp {
  name: string;
  prevValue: any;
  nextValue: any;
  unstable: boolean;
  value?: any;
}

export interface ScanOptions {
  /**
   * Enable or disable scanning
   *
   * @default true
   */
  enabled?: boolean;
  /**
   * Clear the console before logging
   *
   * @default true
   */
  clearLog?: boolean;
  /**
   * Log render results to the console
   *
   * @default true
   */
  log?: boolean;
}

export interface UseScanOptions {
  /**
   * Include children of the component in the scan
   *
   * @default false
   */
  includeChildren?: boolean;
}
