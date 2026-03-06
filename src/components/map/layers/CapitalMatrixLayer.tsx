import { Source, Layer } from 'react-map-gl';
import { useCapitalMatrixLayer } from '@/hooks/useMapLayers';
import { useLayerStore } from '@/store/layers';

export function CapitalMatrixLayer() {
  const enabled = useLayerStore((s) => s.capitalMatrix);
  const geojson = useCapitalMatrixLayer(enabled);
  if (!enabled || !geojson) return null;

  return (
    <Source id="capital-matrix" type="geojson" data={geojson}>
      <Layer
        id="capital-matrix-circle"
        type="circle"
        paint={{
          'circle-radius': ['interpolate', ['linear'], ['get', 'score'], 0, 6, 100, 18],
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'score'],
            0, '#3A3F52',
            50, '#8892A4',
            100, '#C9A84C',
          ],
          'circle-opacity': 0.8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#C9A84C',
          'circle-stroke-opacity': 0.3,
        }}
      />
      <Layer
        id="capital-matrix-label"
        type="symbol"
        layout={{
          'text-field': ['concat', ['to-string', ['get', 'score']], '/100'],
          'text-size': 10,
          'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
        }}
        paint={{ 'text-color': '#E8ECF1' }}
      />
    </Source>
  );
}
