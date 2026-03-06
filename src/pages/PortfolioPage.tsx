import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePortfolioStore, type TrackedAsset } from '@/store/portfolio';
import { ScoreRing } from '@/components/trust/ScoreRing';
import { Plus, X, BarChart3, Building2 } from 'lucide-react';

export function PortfolioPage() {
  const { assets, addAsset, removeAsset } = usePortfolioStore();
  const navigate = useNavigate();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCommunity, setNewCommunity] = useState('');

  const handleAdd = () => {
    if (!newName || !newCommunity) return;
    addAsset({
      id: crypto.randomUUID(),
      projectName: newName,
      community: newCommunity,
      developer: '',
      addedAt: new Date().toISOString(),
    });
    setNewName('');
    setNewCommunity('');
    setShowAdd(false);
  };

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-heading font-semibold mb-1">Portfolio</h1>
          <p className="text-body text-text-secondary">
            Tracked assets with consolidated intelligence scores
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-gold/15 text-gold px-3 py-1.5 rounded text-body font-medium hover:bg-gold/25 transition-colors"
        >
          <Plus size={14} />
          Track Asset
        </button>
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="bg-surface border border-border rounded-lg p-4 mb-6 space-y-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Project / Tower name"
            className="w-full bg-bg border border-border rounded px-3 py-2 text-body text-text-primary placeholder-text-dim focus:border-gold focus:outline-none"
          />
          <input
            type="text"
            value={newCommunity}
            onChange={(e) => setNewCommunity(e.target.value)}
            placeholder="Community"
            className="w-full bg-bg border border-border rounded px-3 py-2 text-body text-text-primary placeholder-text-dim focus:border-gold focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!newName || !newCommunity}
              className="bg-gold text-bg px-4 py-2 rounded text-body font-semibold hover:bg-gold/90 disabled:opacity-40"
            >
              Add to Portfolio
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="text-text-dim hover:text-text-secondary px-4 py-2 text-body"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {assets.length === 0 ? (
        <div className="text-center py-20">
          <Building2 size={40} className="mx-auto mb-3 text-text-dim" />
          <p className="text-body text-text-dim mb-2">No tracked assets yet</p>
          <p className="text-micro text-text-dim">
            Add properties from the Map, Analyse, or X-Ray views to track them here
          </p>
        </div>
      ) : (
        <>
          {/* Asset Cards */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            {assets.map((a) => (
              <AssetCard
                key={a.id}
                asset={a}
                onRemove={() => removeAsset(a.id)}
                onAnalyse={() => navigate(`/analyse/${a.community.replace(/\s+/g, '-')}`)}
              />
            ))}
          </div>

          {/* Comparison Matrix */}
          {assets.length >= 2 && (
            <div className="bg-surface border border-border rounded-lg p-5">
              <h3 className="text-subheading font-medium mb-4">Comparison Matrix</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-body">
                  <thead>
                    <tr className="text-left text-label text-text-dim uppercase tracking-wider">
                      <th className="pb-3 pr-4">Dimension</th>
                      {assets.map((a) => (
                        <th key={a.id} className="pb-3 pr-4">{a.projectName}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {['Capital Quality', 'Developer Score', 'Livability', 'View Block Risk', 'Net Yield', 'SC Trajectory'].map(
                      (dim) => (
                        <tr key={dim} className="border-t border-border">
                          <td className="py-2.5 pr-4 text-text-secondary">{dim}</td>
                          {assets.map((a) => (
                            <td key={a.id} className="py-2.5 pr-4 font-mono text-text-dim">
                              —
                            </td>
                          ))}
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
              <p className="text-micro text-text-dim mt-3">
                Scores populate when Supabase data is connected and community-level intelligence is available.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AssetCard({
  asset,
  onRemove,
  onAnalyse,
}: {
  asset: TrackedAsset;
  onRemove: () => void;
  onAnalyse: () => void;
}) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4 hover:border-gold/20 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-body font-medium text-text-primary">{asset.projectName}</h3>
          <p className="text-micro text-text-secondary">{asset.community}</p>
        </div>
        <button onClick={onRemove} className="text-text-dim hover:text-danger transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="relative">
          <ScoreRing score={0} label="" size={50} />
        </div>
        <div>
          <div className="text-micro text-text-dim">Overall Intelligence</div>
          <div className="text-body text-text-dim font-mono">Not yet scored</div>
        </div>
      </div>

      <button
        onClick={onAnalyse}
        className="flex items-center gap-1.5 text-micro text-gold hover:text-gold/80 transition-colors"
      >
        <BarChart3 size={12} />
        Open Full Analysis
      </button>
    </div>
  );
}
