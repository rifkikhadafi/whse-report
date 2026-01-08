
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

export interface Activity {
  site: string;
  items: {
    category: string;
    description: string;
  }[];
}
