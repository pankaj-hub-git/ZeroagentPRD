-- ============================================================
-- gold.get_amenity_polygons(p_community text)
-- ============================================================
-- Returns all renderable community amenity polygons for a given
-- community (e.g. 'Tilal Al Ghaf'). Each row includes the real
-- DDA polygon geometry as GeoJSON, plus brochure name, category,
-- color, and centroid for label placement.
--
-- Run in Supabase SQL Editor to create/replace.
-- ============================================================

CREATE OR REPLACE FUNCTION gold.get_amenity_polygons(p_community text)
RETURNS TABLE (
  id              bigint,
  community       text,
  brochure_name   text,
  amenity_category text,
  land_use        text,
  render_color    text,
  is_signature    boolean,
  area_sqm        double precision,
  centroid_lat    double precision,
  centroid_lng    double precision,
  polygon_geojson jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    cap.id,
    cap.community,
    cap.brochure_name,
    cap.amenity_category,
    cap.land_use,
    cap.render_color,
    cap.is_signature,
    cap.area_sqm,
    cap.centroid_lat,
    cap.centroid_lng,
    cap.polygon_geojson
  FROM gold.community_amenity_polygons cap
  WHERE cap.community = p_community
    AND cap.amenity_category NOT IN ('UTILITY_INFRA', 'ROAD_ACCESS', 'OTHER')
  ORDER BY cap.amenity_category, cap.brochure_name;
$$;

GRANT EXECUTE ON FUNCTION gold.get_amenity_polygons(text) TO anon, authenticated;


-- ============================================================
-- gold.get_amenity_summary(p_community text)
-- ============================================================
-- Returns category-level aggregates for the sidebar summary.
-- ============================================================

CREATE OR REPLACE FUNCTION gold.get_amenity_summary(p_community text)
RETURNS TABLE (
  amenity_category text,
  render_color     text,
  plot_count       bigint,
  total_area_sqm   double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    cap.amenity_category,
    cap.render_color,
    count(*)            AS plot_count,
    sum(cap.area_sqm)   AS total_area_sqm
  FROM gold.community_amenity_polygons cap
  WHERE cap.community = p_community
    AND cap.amenity_category NOT IN ('UTILITY_INFRA', 'ROAD_ACCESS', 'OTHER')
  GROUP BY cap.amenity_category, cap.render_color
  ORDER BY plot_count DESC;
$$;

GRANT EXECUTE ON FUNCTION gold.get_amenity_summary(text) TO anon, authenticated;
