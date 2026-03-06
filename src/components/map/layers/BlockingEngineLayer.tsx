import { Source, Layer } from 'react-map-gl';
import { useBlockingLayer } from '@/hooks/useMapLayers';
import { useLayerStore } from '@/store/layers';

export function BlockingEngineLayer() {
  const enabled = useLayerStore((s) => s.blockingEngine);
  const geojson = useBlockingLayer(enabled);
  if (!enabled || !geojson) return null;

  return (
    <Source id="blocking-engine" type="geojson" data={geojson}>
      <Layer
        id="blocking-circles"
        type="circle"
        paint={{
          'circle-radius': ['interpolate', ['linear'], ['get', 'risk'], 60, 6, 100, 14],
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'risk'],
            60, '#F39C12',
            80, '#E74C3C',
            100, '#c0392b',
          ],
          'circle-opacity': 0.7,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#E74C3C',
          'circle-stroke-opacity': 0.4,
        }}
      />
      <Layer
        id="blocking-labels"
        type="symbol"
        minzoom={12}
        layout={{
          'text-field': ['concat', 'Risk: ', ['to-string', ['get', 'risk']], '%'],
          'text-size': 10,
          'text-offset': [0, 1.5],
          'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
        }}
        paint={{
          'text-color': '#E74C3C',
          'text-halo-color': '#07071A',
          'text-halo-width': 1,
        }}
      />
    </Source>
  );
}
