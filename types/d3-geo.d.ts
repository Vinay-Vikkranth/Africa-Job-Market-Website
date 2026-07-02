declare module "d3-geo" {
  type GeoObject = {
    type: string;
    features?: GeoObject[];
    geometry?: { type: string; coordinates?: unknown };
    coordinates?: unknown;
  };

  export interface GeoProjection {
    (coordinates: [number, number]): [number, number] | null;
    fitExtent(extent: [[number, number], [number, number]], object: GeoObject): this;
  }

  export function geoMercator(): GeoProjection;
  export function geoPath(projection?: GeoProjection): (object: GeoObject) => string | null;
}
