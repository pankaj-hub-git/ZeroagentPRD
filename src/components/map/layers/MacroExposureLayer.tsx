import { Source, Layer } from 'react-map-gl';
import { useMacroExposureLayer } from '@/hooks/useMapLayers';
import { useLayerStore } from '@/store/layers';

export function MacroExposureLayer() {
  const enabled = useLayerStore((s) => s.macroExposure);
  const geojson = useMacroExposureLayer(enabled);
  if (!enabled || !geojson) return null;

  return (
    <Source id="macro-exposure" type="geojson" data={geojson}>
      <Layer
        id="macro-exposure-heatmap"
        type="heatmap"
        paint={{
          'heatmap-weight': [
            'interpolate', ['linear'],
            ['get', 'concentration'], 0, 0, 100, 1,
          ],
          'heatmap-intensity': 0.5,
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(0,0,0,0)',
            0.2, '#1a3a5c',
            0.4, '#2E75B6',
            0.6, '#5ba3e0',
            0.8, '#F39C12',
            1, '#E74C3C',
          ],
          'heatmap-radius': 30,
          'heatmap-opacity': 0.6,
        }}
      />
    </Source>
  );
}
