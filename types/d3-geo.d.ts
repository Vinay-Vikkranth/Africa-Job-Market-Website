declare module "d3-geo" {
  type GeoObject = {
    type: string;
    features?: GeoObject[];
    geometry?: { type: string; coordinates?: unknown };
    coordinates?: unknown;
    properties?: Record<string, unknown>;
    id?: string | number;
  };

  export interface GeoProjection {
    (coordinates: [number, number]): [number, number] | null;
    fitExtent(extent: [[number, number], [number, number]], object: GeoObject): this;
  }

  export interface GeoPath {
    (object: GeoObject): string | null;
    centroid(object: GeoObject): [number, number];
  }

  export function geoMercator(): GeoProjection;
  export function geoPath(projection?: GeoProjection): GeoPath;
  export function geoCentroid(object: GeoObject): [number, number];
}
