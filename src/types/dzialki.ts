export interface Parcel {
  teryt: string;
  voivodeship: string;
  county: string;
  commune: string;
  region: string;
  parcelNumber: string;
  coordinates: Array<{ lat: number; lng: number }>;
  datasource: string;
}

export interface WmsLayerConfig {
  id: string;
  name: string;
  url: string;
  layers: string;
  enabled: boolean;
}
