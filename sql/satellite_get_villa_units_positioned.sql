-- ============================================================
-- satellite_get_villa_units_positioned
-- ============================================================
-- Replacement for satellite_get_villa_units that computes
-- unit coordinates by distributing them along the longest
-- diagonal of their plex row polygon.
--
-- Uses:
--   ST_LongestLine(geom, geom) — real longest diagonal (not bbox)
--   ST_LineInterpolatePoint(line, fraction) — distribute N units
--     along that diagonal with 8% margin on each end
--
-- Run this in the Supabase SQL Editor to create/replace the function.
-- ============================================================

CREATE OR REPLACE FUNCTION satellite_get_villa_units(p_masterplan text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  WITH cluster_diags AS (
    -- For each cluster polygon, compute the longest diagonal line
    SELECT
      cp.id           AS cluster_id,
      cp.phase_name,
      cp.dda_plot_number,
      cp.geometry,
      ST_LongestLine(cp.geometry, cp.geometry) AS diagonal
    FROM layers.cluster_polygons cp
    WHERE cp.masterplan = p_masterplan
      AND cp.geometry IS NOT NULL
  ),
  units_with_rank AS (
    -- Rank units within each cluster (by unit_number for stable ordering)
    SELECT
      u.*,
      cd.diagonal,
      cd.cluster_id,
      ROW_NUMBER() OVER (
        PARTITION BY COALESCE(u.dda_plot_number, u.phase_name)
        ORDER BY u.unit_number
      ) AS unit_rank,
      COUNT(*) OVER (
        PARTITION BY COALESCE(u.dda_plot_number, u.phase_name)
      ) AS units_in_cluster
    FROM layers.villa_units u
    LEFT JOIN cluster_diags cd
      ON cd.dda_plot_number = u.dda_plot_number
      OR (cd.dda_plot_number IS NULL AND cd.phase_name = u.phase_name)
    WHERE u.masterplan = p_masterplan
  ),
  positioned AS (
    SELECT
      ur.id,
      ur.masterplan,
      ur.phase_name,
      ur.dda_plot_number,
      ur.unit_number,
      ur.villa_type,
      ur.bedrooms,
      ur.bua_sqft,
      ur.plot_sqft,
      ur.rooms_en,
      ur.row_position,
      ur.area_sqft,
      ur.diagonal IS NOT NULL AS has_diagonal,
      -- Compute positioned point along diagonal
      -- fraction = 0.08 + (rank-1) * (0.84 / (n-1))  for n>1
      -- fraction = 0.5 for single unit
      CASE
        WHEN ur.diagonal IS NOT NULL AND ur.units_in_cluster > 1 THEN
          ST_LineInterpolatePoint(
            ur.diagonal,
            0.08 + (ur.unit_rank - 1)::float * 0.84 / GREATEST(ur.units_in_cluster - 1, 1)
          )
        WHEN ur.diagonal IS NOT NULL AND ur.units_in_cluster = 1 THEN
          ST_LineInterpolatePoint(ur.diagonal, 0.5)
        ELSE
          -- Fallback: use original point geometry if no cluster polygon matched
          ur.geometry
      END AS positioned_geom,
      -- Keep original geometry for reference
      ur.geometry AS original_geom
    FROM units_with_rank ur
  )
  SELECT jsonb_build_object(
    'type', 'FeatureCollection',
    'features', COALESCE(jsonb_agg(
      jsonb_build_object(
        'type', 'Feature',
        'geometry', ST_AsGeoJSON(
          COALESCE(p.positioned_geom, p.original_geom)
        )::jsonb,
        'properties', jsonb_build_object(
          'id',              p.id,
          'unit_number',     p.unit_number,
          'phase_name',      p.phase_name,
          'dda_plot_number', p.dda_plot_number,
          'villa_type',      p.villa_type,
          'bedrooms',        p.bedrooms,
          'bua_sqft',        p.bua_sqft,
          'plot_sqft',       p.plot_sqft,
          'rooms_en',        p.rooms_en,
          'row_position',    p.row_position,
          'area_sqft',       p.area_sqft,
          'positioned',      p.has_diagonal
        )
      )
    ), '[]'::jsonb)
  ) INTO result
  FROM positioned p;

  RETURN result;
END;
$$;

-- Grant access so the anon/authenticated roles can call it
GRANT EXECUTE ON FUNCTION satellite_get_villa_units(text) TO anon, authenticated;
