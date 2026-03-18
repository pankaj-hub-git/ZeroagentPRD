import { Source, Layer } from 'react-map-gl';
import { useAmenityPolygons } from '@/hooks/useAmenityPolygons';
import { useLayerStore } from '@/store/layers';

const COMMUNITY = 'Tilal Al Ghaf'; // Default community — will be dynamic later

export function AmenityPolygonsLayer() {
  const enabled = useLayerStore((s) => s.amenityPolygons);
  const { polygons, labels } = useAmenityPolygons(COMMUNITY, enabled);

  if (!enabled || !polygons) return null;

  return (
    <>
      {/* ── Fill layer: colored polygons ─────────────────── */}
      <Source id="amenity-polygons" type="geojson" data={polygons}>
        <Layer
          id="amenity-fill"
          type="fill"
          paint={{
            'fill-color': ['get', 'render_color'],
            'fill-opacity': [
              'case',
              ['get', 'is_signature'], 0.45,
              0.25,
            ],
          }}
        />
        <Layer
          id="amenity-outline"
          type="line"
          paint={{
            'line-color': ['get', 'render_color'],
            'line-width': [
              'case',
              ['get', 'is_signature'], 2,
              1,
            ],
            'line-opacity': 0.7,
          }}
        />
      </Source>

      {/* ── Label layer: brochure names at centroids ─────── */}
      {labels && (
        <Source id="amenity-labels" type="geojson" data={labels}>
          <Layer
            id="amenity-label-text"
            type="symbol"
            layout={{
              'text-field': ['get', 'brochure_name'],
              'text-size': [
                'case',
                ['get', 'is_signature'], 13,
                10,
              ],
              'text-font': [
                'case',
                ['get', 'is_signature'],
                ['literal', ['DIN Pro Bold', 'Arial Unicode MS Bold']],
                ['literal', ['DIN Pro Medium', 'Arial Unicode MS Regular']],
              ],
              'text-anchor': 'center',
              'text-max-width': 8,
              'text-allow-overlap': false,
              'text-optional': true,
            }}
            paint={{
              'text-color': '#E8ECF1',
              'text-halo-color': 'rgba(0,0,0,0.8)',
              'text-halo-width': 1.5,
            }}
            minzoom={13}
          />
        </Source>
      )}
    </>
  );
}
