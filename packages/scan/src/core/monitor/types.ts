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
  interactions: Array<Interaction>;
  components: Array<Component>;
  session: Session;
}

export interface Interaction {
  id: string; // a hashed unique id for interaction (groupable across sessions)
  name: string; // name of interaction (i.e nav#top-menu.sc-601d0142-19.gHiJkL) or something useful
  type: string; // type of interaction i.e pointer
  time: number; // time of interaction in ms
  timestamp: number;
  //... anything you might need here
}

export interface Component {
  interactionId: string; // grouping components by interaction
  name: string;
  renders: number; // how many times it re-rendered / instances (normalized)
  instances: number; // instances which will be used to get number of total renders by * by renders
  totalTime?: number;
  selfTime?: number;
}
