import { Source, Layer } from 'react-map-gl';
import { useDLDVerifiedLayer } from '@/hooks/useMapLayers';

export function DLDVerifiedLayer() {
  const geojson = useDLDVerifiedLayer();
  if (!geojson) return null;

  return (
    <Source id="dld-verified" type="geojson" data={geojson}>
      <Layer
        id="dld-verified-circle"
        type="circle"
        paint={{
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 3, 14, 6],
          'circle-color': '#C9A84C',
          'circle-opacity': 0.7,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#C9A84C',
          'circle-stroke-opacity': 0.3,
        }}
      />
      <Layer
        id="dld-verified-label"
        type="symbol"
        minzoom={13}
        layout={{
          'text-field': ['get', 'name'],
          'text-size': 10,
          'text-offset': [0, 1.5],
          'text-font': ['DIN Pro Regular', 'Arial Unicode MS Regular'],
        }}
        paint={{
          'text-color': '#8892A4',
          'text-halo-color': '#07071A',
          'text-halo-width': 1,
        }}
      />
    </Source>
  );
}
