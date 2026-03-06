import { useLayerStore } from '@/store/layers';
import { useNavStore } from '@/store/navigation';
import {
  Layers,
  DollarSign,
  Building2,
  TreePine,
  AlertTriangle,
  Calendar,
  Globe,
  Receipt,
  ShieldAlert,
} from 'lucide-react';

const ZOOM_LABELS: Record<number, string> = {
  1: 'Global',
  2: 'City',
  3: 'Area',
  4: 'Community',
  5: 'Tower / Unit',
};

const LAYER_CONFIG = [
  { key: 'capitalMatrix' as const, label: 'Capital Matrix', icon: DollarSign },
  { key: 'developerTruth' as const, label: 'Developer Truth', icon: Building2 },
  { key: 'livabilityXray' as const, label: 'Livability X-Ray', icon: TreePine },
  { key: 'blockingEngine' as const, label: 'Blocking Engine', icon: AlertTriangle },
  { key: 'phaseIntelligence' as const, label: 'Phase Intelligence', icon: Calendar },
  { key: 'macroExposure' as const, label: 'Macro Exposure', icon: Globe },
  { key: 'serviceCharges' as const, label: 'Service Charges', icon: Receipt },
  { key: 'listingIntegrity' as const, label: 'Listing Integrity', icon: ShieldAlert },
];

export function Sidebar() {
  const { zoomLevel, setZoomLevel, activeCommunity, activeTower } = useNavStore();
  const layers = useLayerStore();

  return (
    <aside className="w-[280px] bg-surface border-r border-border flex flex-col shrink-0 overflow-y-auto">
      {/* Zoom Level */}
      <div className="p-4 border-b border-border">
        <div className="text-label text-text-dim uppercase tracking-wider mb-3">
          Zoom Level
        </div>
        <div className="flex gap-1">
          {([1, 2, 3, 4, 5] as const).map((z) => (
            <button
              key={z}
              onClick={() => setZoomLevel(z)}
              className={`flex-1 py-1.5 rounded text-micro font-medium transition-colors ${
                zoomLevel === z
                  ? 'bg-gold/20 text-gold'
                  : 'bg-white/5 text-text-dim hover:text-text-secondary'
              }`}
            >
              {z}
            </button>
          ))}
        </div>
        <div className="text-micro text-text-dim mt-1.5">
          {ZOOM_LABELS[zoomLevel]}
        </div>
      </div>

      {/* Active Context */}
      {(activeCommunity || activeTower) && (
        <div className="p-4 border-b border-border">
          <div className="text-label text-text-dim uppercase tracking-wider mb-2">
            Active Context
          </div>
          {activeCommunity && (
            <div className="text-body text-text-primary">{activeCommunity}</div>
          )}
          {activeTower && (
            <div className="text-micro text-gold mt-0.5">{activeTower}</div>
          )}
        </div>
      )}

      {/* Intelligence Layers */}
      <div className="p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <Layers size={13} className="text-text-dim" />
          <span className="text-label text-text-dim uppercase tracking-wider">
            Intelligence Layers
          </span>
        </div>
        <div className="flex flex-col gap-1">
          {LAYER_CONFIG.map((l) => (
            <button
              key={l.key}
              onClick={() => layers.toggle(l.key)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded text-body transition-colors ${
                layers[l.key]
                  ? 'bg-gold/10 text-gold'
                  : 'text-text-secondary hover:bg-white/5'
              }`}
            >
              <l.icon size={14} />
              {l.label}
              <div
                className={`w-1.5 h-1.5 rounded-full ml-auto ${
                  layers[l.key] ? 'bg-gold' : 'bg-text-dim'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      {/* DLD Verified badge */}
      <div className="mt-auto p-4 border-t border-border">
        <div className="flex items-center gap-2 text-micro text-verified">
          <div className="w-1.5 h-1.5 rounded-full bg-verified" />
          DLD Verified Layer — Always Active
        </div>
      </div>
    </aside>
  );
}
