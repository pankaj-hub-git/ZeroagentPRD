import { useState, useCallback } from 'react';
import MapGL, { type MapLayerMouseEvent } from 'react-map-gl';
import { DLDVerifiedLayer } from './layers/DLDVerifiedLayer';
import { CapitalMatrixLayer } from './layers/CapitalMatrixLayer';
import { DeveloperTruthLayer } from './layers/DeveloperTruthLayer';
import { LivabilityLayer } from './layers/LivabilityLayer';
import { BlockingEngineLayer } from './layers/BlockingEngineLayer';
import { PhaseIntelLayer } from './layers/PhaseIntelLayer';
import { MacroExposureLayer } from './layers/MacroExposureLayer';
import { ServiceChargesLayer } from './layers/ServiceChargesLayer';
import { ListingIntegrityLayer } from './layers/ListingIntegrityLayer';
import { MapTooltip } from './MapTooltip';

export function MapCanvas() {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    properties: Record<string, unknown>;
  } | null>(null);

  const onHover = useCallback((e: MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    if (feature?.properties) {
      setTooltip({ x: e.point.x, y: e.point.y, properties: feature.properties });
    } else {
      setTooltip(null);
    }
  }, []);

  const interactiveIds = [
    'dld-verified-circle',
    'capital-matrix-circle',
    'developer-truth-unclustered',
    'blocking-circles',
    'phase-intel-circles',
    'sc-circles',
    'listing-integrity-circles',
  ];

  return (
    <div className="relative w-full h-full">
      <MapGL
        mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        initialViewState={{
          longitude: 55.2708,
          latitude: 25.2048,
          zoom: 10.5,
        }}
        style={{ width: '100%', height: '100%' }}
        onMouseMove={onHover}
        onMouseLeave={() => setTooltip(null)}
        interactiveLayerIds={interactiveIds}
      >
        {/* Always ON */}
        <DLDVerifiedLayer />

        {/* Toggled layers */}
        <CapitalMatrixLayer />
        <DeveloperTruthLayer />
        <LivabilityLayer />
        <BlockingEngineLayer />
        <PhaseIntelLayer />
        <MacroExposureLayer />
        <ServiceChargesLayer />
        <ListingIntegrityLayer />
      </MapGL>

      {tooltip && (
        <MapTooltip x={tooltip.x} y={tooltip.y} properties={tooltip.properties} />
      )}
    </div>
  );
}
