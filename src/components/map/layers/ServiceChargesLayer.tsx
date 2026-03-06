import { Source, Layer } from 'react-map-gl';
import { useServiceChargesLayer } from '@/hooks/useMapLayers';
import { useLayerStore } from '@/store/layers';

export function ServiceChargesLayer() {
  const enabled = useLayerStore((s) => s.serviceCharges);
  const geojson = useServiceChargesLayer(enabled);
  if (!enabled || !geojson) return null;

  return (
    <Source id="service-charges" type="geojson" data={geojson}>
      <Layer
        id="sc-circles"
        type="circle"
        paint={{
          'circle-radius': 6,
          'circle-color': [
            'case',
            ['get', 'warning'], '#E74C3C',
            '#27AE60',
          ],
          'circle-opacity': 0.7,
          'circle-stroke-width': 1,
          'circle-stroke-color': 'rgba(255,255,255,0.1)',
        }}
      />
      <Layer
        id="sc-labels"
        type="symbol"
        minzoom={12}
        layout={{
          'text-field': ['concat', ['to-string', ['get', 'best']], ' AED/sqft'],
          'text-size': 9,
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
