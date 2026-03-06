import { Source, Layer } from 'react-map-gl';
import { useDeveloperTruthLayer } from '@/hooks/useMapLayers';
import { useLayerStore } from '@/store/layers';

export function DeveloperTruthLayer() {
  const enabled = useLayerStore((s) => s.developerTruth);
  const geojson = useDeveloperTruthLayer(enabled);
  if (!enabled || !geojson) return null;

  return (
    <Source id="developer-truth" type="geojson" data={geojson} cluster clusterMaxZoom={12} clusterRadius={40}>
      <Layer
        id="developer-truth-clusters"
        type="circle"
        filter={['has', 'point_count']}
        paint={{
          'circle-color': '#C9A84C',
          'circle-radius': ['step', ['get', 'point_count'], 15, 50, 25, 200, 35],
          'circle-opacity': 0.6,
        }}
      />
      <Layer
        id="developer-truth-cluster-count"
        type="symbol"
        filter={['has', 'point_count']}
        layout={{
          'text-field': '{point_count_abbreviated}',
          'text-size': 11,
          'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
        }}
        paint={{ 'text-color': '#E8ECF1' }}
      />
      <Layer
        id="developer-truth-unclustered"
        type="circle"
        filter={['!', ['has', 'point_count']]}
        paint={{
          'circle-radius': 5,
          'circle-color': [
            'match',
            ['get', 'verdict'],
            'DELIVERED', '#27AE60',
            'PARTIAL', '#F39C12',
            'NOT_DELIVERED', '#E74C3C',
            '#8892A4',
          ],
          'circle-stroke-width': 1,
          'circle-stroke-color': 'rgba(255,255,255,0.2)',
        }}
      />
    </Source>
  );
}
