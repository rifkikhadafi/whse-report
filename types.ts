export interface SiteData {
  name: string;
  issued: number;
  received: number;
  stock: number;
  pob: number;
  color: string;
}

export interface FuelData {
  name: string;
  biosolar: number;
  pertalite: number;
  pertadex: number;
}

export interface RigMove {
  site: string;
  rig_name: string;
  from_loc: string;
  to_loc: string;
  move_date?: string;
  date?: string; // Record date
}

export interface Activity {
  site: string;
  items: {
    category: string;
    description: string;
  }[];
}