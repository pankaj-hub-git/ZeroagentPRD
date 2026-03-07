import { useEffect, useState } from 'react';
import { sb } from '@/lib/supabase';

/* ── GeoJSON helpers ────────────────────────────────────── */
interface Feature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: Record<string, unknown>;
}

interface FeatureCollection {
  type: 'FeatureCollection';
  features: Feature[];
}

function toFC(features: Feature[]): FeatureCollection {
  return { type: 'FeatureCollection', features };
}

function pt(lng: number, lat: number, props: Record<string, unknown>): Feature {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [lng, lat] },
    properties: props,
  };
}

/* ── Layer 9: DLD Verified (always ON) ──────────────────── */
export function useDLDVerifiedLayer() {
  const [geojson, setGeojson] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    const run = async () => {
      const { data } = await sb
        .schema('bronze').from('derived_project_registry')
        .select(
          'project_name, community, area_name, avg_psf, transaction_count, latest_txn_date, latitude, longitude'
        )
        .not('latitude', 'is', null);

      if (data) {
        const features = data
          .filter((r: Record<string, unknown>) => r.latitude && r.longitude)
          .map((r: Record<string, unknown>) =>
            pt(r.longitude as number, r.latitude as number, {
              name: r.project_name,
              community: r.community,
              area: r.area_name,
              avgPsf: r.avg_psf,
              txnCount: r.transaction_count,
              latestTxn: r.latest_txn_date,
            })
          );
        setGeojson(toFC(features));
      }
    };
    run();
  }, []);

  return geojson;
}

/* ── Layer 1: Capital Matrix ────────────────────────────── */
export function useCapitalMatrixLayer(enabled: boolean) {
  const [geojson, setGeojson] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const run = async () => {
      const { data } = await sb
        .schema('gold').from('capital_flow_summary')
        .select(
          'area_name, capital_quality_score, net_inflow_direction, rotation_origin, buyer_nationality_spread, qoq_trajectory'
        )
        .order('capital_quality_score', { ascending: false });

      if (data) {
        const features = data.map((r: Record<string, unknown>, i: number) =>
          pt(55.2 + (i % 20) * 0.02, 25.1 + Math.floor(i / 20) * 0.02, {
            name: r.area_name,
            score: r.capital_quality_score,
            direction: r.net_inflow_direction,
            trajectory: r.qoq_trajectory,
          })
        );
        setGeojson(toFC(features));
      }
    };
    run();
  }, [enabled]);

  return geojson;
}

/* ── Layer 2: Developer Truth (Satellite) ───────────────── */
export function useDeveloperTruthLayer(enabled: boolean) {
  const [geojson, setGeojson] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const run = async () => {
      const { data } = await sb
        .schema('bronze').from('masterplan_gee_queue')
        .select(
          'plot_number, community_name, amenity_class, delivery_verdict, delivery_score, gee_composite_end, gee_bbox_west, gee_bbox_south, gee_bbox_east, gee_bbox_north'
        )
        .eq('gee_status', 'DONE');

      if (data) {
        const features = data
          .filter(
            (r: Record<string, unknown>) =>
              r.gee_bbox_west && r.gee_bbox_south && r.gee_bbox_east && r.gee_bbox_north
          )
          .map((r: Record<string, unknown>) => {
            const lng =
              ((r.gee_bbox_west as number) + (r.gee_bbox_east as number)) / 2;
            const lat =
              ((r.gee_bbox_south as number) + (r.gee_bbox_north as number)) / 2;
            return pt(lng, lat, {
              plot: r.plot_number,
              community: r.community_name,
              amenity: r.amenity_class,
              verdict: r.delivery_verdict,
              score: r.delivery_score,
              imageryDate: r.gee_composite_end,
            });
          });
        setGeojson(toFC(features));
      }
    };
    run();
  }, [enabled]);

  return geojson;
}

/* ── Layer 3: Livability X-Ray ──────────────────────────── */
export function useLivabilityLayer(enabled: boolean) {
  const [geojson, setGeojson] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const run = async () => {
      const { data } = await sb
        .schema('gold').from('livability_index')
        .select(
          'building_id, area_name, livability_score, noise_score, green_score, school_score, traffic_score'
        )
        .limit(4298);

      if (data) {
        const features = data.map((r: Record<string, unknown>, i: number) =>
          pt(55.15 + (i % 60) * 0.005, 25.05 + Math.floor(i / 60) * 0.005, {
            name: r.area_name,
            livability: r.livability_score,
            noise: r.noise_score,
            green: r.green_score,
            school: r.school_score,
            traffic: r.traffic_score,
          })
        );
        setGeojson(toFC(features));
      }
    };
    run();
  }, [enabled]);

  return geojson;
}

/* ── Layer 4: Blocking Engine ───────────────────────────── */
export function useBlockingLayer(enabled: boolean) {
  const [geojson, setGeojson] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const run = async () => {
      const { data } = await sb
        .schema('gold').from('view_blocking_v3')
        .select(
          'observer_name, view_name, blocker_name, risk_score, safe_above_floor, timeline, blocker_status, pct_of_view_blocked'
        )
        .gte('risk_score', 60);

      if (data) {
        const features = data.map((r: Record<string, unknown>, i: number) =>
          pt(55.2 + (i % 30) * 0.008, 25.1 + Math.floor(i / 30) * 0.008, {
            observer: r.observer_name,
            view: r.view_name,
            blocker: r.blocker_name,
            risk: r.risk_score,
            safeAbove: r.safe_above_floor,
            timeline: r.timeline,
            pctBlocked: r.pct_of_view_blocked,
          })
        );
        setGeojson(toFC(features));
      }
    };
    run();
  }, [enabled]);

  return geojson;
}

/* ── Layer 5: Phase Intelligence ────────────────────────── */
export function usePhaseIntelLayer(enabled: boolean) {
  const [geojson, setGeojson] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const run = async () => {
      const { data } = await sb
        .schema('gold').from('phase_registry')
        .select(
          'phase_name, community, developer, status, completion_pct, units_total, units_delivered'
        );

      if (data) {
        const features = data.map((r: Record<string, unknown>, i: number) =>
          pt(55.15 + (i % 40) * 0.008, 25.05 + Math.floor(i / 40) * 0.008, {
            phase: r.phase_name,
            community: r.community,
            status: r.status,
            completion: r.completion_pct,
            total: r.units_total,
            delivered: r.units_delivered,
          })
        );
        setGeojson(toFC(features));
      }
    };
    run();
  }, [enabled]);

  return geojson;
}

/* ── Layer 6: Macro Exposure ────────────────────────────── */
export function useMacroExposureLayer(enabled: boolean) {
  const [geojson, setGeojson] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const run = async () => {
      const { data } = await sb
        .schema('gold').from('nationality_momentum')
        .select(
          'area_name, nationality, momentum_score, qoq_change, buyer_concentration_pct'
        )
        .order('buyer_concentration_pct', { ascending: false });

      if (data) {
        const features = data.map((r: Record<string, unknown>, i: number) =>
          pt(55.15 + (i % 40) * 0.006, 25.05 + Math.floor(i / 40) * 0.006, {
            area: r.area_name,
            nationality: r.nationality,
            momentum: r.momentum_score,
            concentration: r.buyer_concentration_pct,
          })
        );
        setGeojson(toFC(features));
      }
    };
    run();
  }, [enabled]);

  return geojson;
}

/* ── Layer 7: Service Charges ───────────────────────────── */
export function useServiceChargesLayer(enabled: boolean) {
  const [geojson, setGeojson] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const run = async () => {
      const { data } = await sb
        .schema('gold').from('sc_truth_layer')
        .select('phase_name, mollak_sc, reported_sc, best_sc, sc_status')
        .not('best_sc', 'is', null);

      if (data) {
        const features = data.map((r: Record<string, unknown>, i: number) =>
          pt(55.15 + (i % 20) * 0.01, 25.08 + Math.floor(i / 20) * 0.01, {
            phase: r.phase_name,
            mollak: r.mollak_sc,
            reported: r.reported_sc,
            best: r.best_sc,
            status: r.sc_status,
            warning:
              (r.mollak_sc as number) > (r.reported_sc as number) ? true : false,
          })
        );
        setGeojson(toFC(features));
      }
    };
    run();
  }, [enabled]);

  return geojson;
}

/* ── Layer 8: Listing Integrity ─────────────────────────── */
export function useListingIntegrityLayer(enabled: boolean) {
  const [geojson, setGeojson] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const run = async () => {
      const { data } = await sb
        .from('crisis_listing_snapshots')
        .select(
          'project_name, detected_at, listing_count, price_drop_pct, days_stale, manipulation_type'
        )
        .or('days_stale.gt.60,price_drop_pct.gt.15');

      if (data) {
        const features = data.map((r: Record<string, unknown>, i: number) =>
          pt(55.18 + (i % 25) * 0.008, 25.08 + Math.floor(i / 25) * 0.008, {
            project: r.project_name,
            detected: r.detected_at,
            listings: r.listing_count,
            priceDrop: r.price_drop_pct,
            daysStale: r.days_stale,
            manipulation: r.manipulation_type,
          })
        );
        setGeojson(toFC(features));
      }
    };
    run();
  }, [enabled]);

  return geojson;
}
