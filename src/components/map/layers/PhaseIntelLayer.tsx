import { Source, Layer } from 'react-map-gl';
import { usePhaseIntelLayer } from '@/hooks/useMapLayers';
import { useLayerStore } from '@/store/layers';

export function PhaseIntelLayer() {
  const enabled = useLayerStore((s) => s.phaseIntelligence);
  const geojson = usePhaseIntelLayer(enabled);
  if (!enabled || !geojson) return null;

  return (
    <Source id="phase-intel" type="geojson" data={geojson}>
      <Layer
        id="phase-intel-circles"
        type="circle"
        paint={{
          'circle-radius': 6,
          'circle-color': [
            'match',
            ['get', 'status'],
            'Delivered', '#27AE60',
            'Under Construction', '#F39C12',
            'Planning', '#3A3F52',
            '#8892A4',
          ],
          'circle-opacity': 0.8,
          'circle-stroke-width': [
            'match',
            ['get', 'status'],
            'Under Construction', 3,
            1,
          ],
          'circle-stroke-color': [
            'match',
            ['get', 'status'],
            'Under Construction', '#F39C12',
            'Planning', '#3A3F52',
            'transparent',
          ],
          'circle-stroke-opacity': 0.5,
        }}
      />
      <Layer
        id="phase-intel-labels"
        type="symbol"
        minzoom={12}
        layout={{
          'text-field': ['get', 'phase'],
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
