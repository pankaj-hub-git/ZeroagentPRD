import { Source, Layer } from 'react-map-gl';
import { useLivabilityLayer } from '@/hooks/useMapLayers';
import { useLayerStore } from '@/store/layers';

export function LivabilityLayer() {
  const enabled = useLayerStore((s) => s.livabilityXray);
  const geojson = useLivabilityLayer(enabled);
  if (!enabled || !geojson) return null;

  return (
    <Source id="livability" type="geojson" data={geojson}>
      <Layer
        id="livability-heatmap"
        type="heatmap"
        paint={{
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'livability'], 0, 0, 100, 1],
          'heatmap-intensity': 0.6,
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(0,0,0,0)',
            0.2, '#2c1654',
            0.4, '#5b2d8e',
            0.6, '#8E44AD',
            0.8, '#a855f7',
            1, '#c084fc',
          ],
          'heatmap-radius': 25,
          'heatmap-opacity': 0.7,
        }}
      />
    </Source>
  );
}
