import { useEffect, useState } from 'react';
import { sb } from '@/lib/supabase';
import type { AmenityPolygon, AmenitySummary } from '@/types/database';

/* ── GeoJSON builder for polygon fill layers ─────────────── */
interface PolygonFeature {
  type: 'Feature';
  geometry: GeoJSON.Geometry;
  properties: {
    id: number;
    brochure_name: string;
    amenity_category: string;
    render_color: string;
    is_signature: boolean;
    area_sqm: number;
    centroid_lat: number;
    centroid_lng: number;
  };
}

interface PolygonFC {
  type: 'FeatureCollection';
  features: PolygonFeature[];
}

/* ── Label centroid GeoJSON for text symbols ──────────────── */
interface LabelFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: {
    brochure_name: string;
    amenity_category: string;
    is_signature: boolean;
  };
}

interface LabelFC {
  type: 'FeatureCollection';
  features: LabelFeature[];
}

/**
 * Fetches amenity polygons for a community via the gold.get_amenity_polygons RPC.
 * Returns fill-layer GeoJSON (polygons) and label-layer GeoJSON (centroids).
 */
export function useAmenityPolygons(community: string, enabled: boolean) {
  const [polygons, setPolygons] = useState<PolygonFC | null>(null);
  const [labels, setLabels] = useState<LabelFC | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !community) {
      setPolygons(null);
      setLabels(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const run = async () => {
      const { data, error: err } = await sb.schema('gold').rpc('get_amenity_polygons', {
        p_community: community,
      });

      if (cancelled) return;

      if (err) {
        setError(err.message);
        setPolygons(null);
        setLabels(null);
        setLoading(false);
        return;
      }

      const rows = data as AmenityPolygon[];

      const polyFeatures: PolygonFeature[] = rows
        .filter((r) => r.polygon_geojson)
        .map((r) => ({
          type: 'Feature' as const,
          geometry: typeof r.polygon_geojson === 'string'
            ? JSON.parse(r.polygon_geojson)
            : r.polygon_geojson,
          properties: {
            id: r.id,
            brochure_name: r.brochure_name,
            amenity_category: r.amenity_category,
            render_color: r.render_color,
            is_signature: r.is_signature,
            area_sqm: r.area_sqm,
            centroid_lat: r.centroid_lat,
            centroid_lng: r.centroid_lng,
          },
        }));

      const labelFeatures: LabelFeature[] = rows
        .filter((r) => r.centroid_lat && r.centroid_lng)
        .map((r) => ({
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [r.centroid_lng, r.centroid_lat] as [number, number],
          },
          properties: {
            brochure_name: r.brochure_name,
            amenity_category: r.amenity_category,
            is_signature: r.is_signature,
          },
        }));

      setPolygons({ type: 'FeatureCollection', features: polyFeatures });
      setLabels({ type: 'FeatureCollection', features: labelFeatures });
      setError(null);
      setLoading(false);
    };

    run();
    return () => { cancelled = true; };
  }, [community, enabled]);

  return { polygons, labels, loading, error };
}

/**
 * Fetches amenity summary for sidebar display.
 */
export function useAmenitySummary(community: string, enabled: boolean) {
  const [summary, setSummary] = useState<AmenitySummary[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !community) {
      setSummary(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const run = async () => {
      const { data } = await sb.schema('gold').rpc('get_amenity_summary', {
        p_community: community,
      });

      if (cancelled) return;
      setSummary((data as AmenitySummary[]) ?? null);
      setLoading(false);
    };

    run();
    return () => { cancelled = true; };
  }, [community, enabled]);

  return { summary, loading };
}
