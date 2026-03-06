import { Source, Layer } from 'react-map-gl';
import { useListingIntegrityLayer } from '@/hooks/useMapLayers';
import { useLayerStore } from '@/store/layers';

export function ListingIntegrityLayer() {
  const enabled = useLayerStore((s) => s.listingIntegrity);
  const geojson = useListingIntegrityLayer(enabled);
  if (!enabled || !geojson) return null;

  return (
    <Source id="listing-integrity" type="geojson" data={geojson}>
      <Layer
        id="listing-integrity-circles"
        type="circle"
        paint={{
          'circle-radius': 7,
          'circle-color': '#F39C12',
          'circle-opacity': 0.8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#E74C3C',
          'circle-stroke-opacity': 0.5,
        }}
      />
      <Layer
        id="listing-integrity-labels"
        type="symbol"
        minzoom={12}
        layout={{
          'text-field': ['get', 'project'],
          'text-size': 9,
          'text-offset': [0, 1.8],
          'text-font': ['DIN Pro Regular', 'Arial Unicode MS Regular'],
        }}
        paint={{
          'text-color': '#F39C12',
          'text-halo-color': '#07071A',
          'text-halo-width': 1,
        }}
      />
    </Source>
  );
}
