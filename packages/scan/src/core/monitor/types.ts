export enum Device {
  DESKTOP = 0,
  TABLET = 1,
  MOBILE = 2,
}

export interface Session {
  id: string;
  url: string; // flush everytime route changes for accuracy
  device: Device;
  agent: string;
  wifi: string;
  cpu: number;
  gpu: string | null;
  mem: number;
}

export interface IngestRequest {
  interactions: Array<ScanInteraction>;
  components: Array<Component>;
  session: Session;
}
export interface ScanInteraction {
  componentName: string
  componentPath: string
  performanceInteraction: PerformanceInteraction
}

// export interface Interaction {
//   // id: string; // a hashed unique id for interaction (groupable across sessions)
//   // name: string; // name of Component
//   // type: string; // type of interaction i.e pointer
//   // time: number; // time of interaction in ms
//   componentName: string
//   componentPath: string, // the unique identifier for the interaction on the website
//   entry: In

//   // timestamp: number;
//   // //... anything you might need here
// }
export interface PerformanceInteraction {
  id: string;
  latency: number;
  entries: PerformanceInteractionEntry[];
  target: Element;
  type: 'pointer' | 'keyboard' | null;
  startTime: number;
  processingStart: number;
  processingEnd: number;
  duration: number;
  inputDelay: number;
  processingDuration: number;
  presentationDelay: number;
  // componentPath: string, // the unique identifier for the interaction on the website
  // componentName: string
}

export interface Component {
  interactionId: string; // grouping components by interaction
  name: string;
  renders: number; // how many times it re-rendered / instances (normalized)
  instances: number; // instances which will be used to get number of total renders by * by renders
  totalTime?: number;
  selfTime?: number;
}
