import { useState } from 'react';
import { useFeedData } from '@/hooks/useFeedData';
import { FeedItemCard } from '@/components/feed/FeedItem';
import { Loader2 } from 'lucide-react';

const CATEGORIES = [
  { key: 'all', label: 'All Signals' },
  { key: 'policy', label: 'Policy' },
  { key: 'macro', label: 'Macro' },
  { key: 'safe_haven', label: 'Safe Haven' },
  { key: 'government', label: 'Government' },
  { key: 'crisis', label: 'Crisis' },
];

export function FeedPage() {
  const { items, loading } = useFeedData();
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? items : items.filter((i) => i.category === filter);

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-heading font-semibold mb-1">Intelligence Feed</h1>
        <p className="text-body text-text-secondary">
          Real-time processed intelligence signals with quantified real-estate impact
        </p>
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 mb-6">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setFilter(c.key)}
            className={`px-3 py-1.5 rounded text-micro font-medium transition-colors ${
              filter === c.key
                ? 'bg-gold/15 text-gold'
                : 'bg-white/5 text-text-dim hover:text-text-secondary'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-gold" size={24} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-text-dim text-body">
          No intelligence signals found for this category.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <FeedItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
