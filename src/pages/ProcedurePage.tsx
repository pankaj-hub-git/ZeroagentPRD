import { useGuides } from '@/hooks/useProcedureData';
import { useProcedureStore } from '@/store/procedure';
import { AudienceFilter } from '@/components/procedure/AudienceFilter';
import { GuideCard } from '@/components/procedure/GuideCard';

export function ProcedurePage() {
  const { audienceFilter, setAudienceFilter } = useProcedureStore();
  const { guides, loading } = useGuides(audienceFilter);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="text-gold text-label tracking-[3px] uppercase font-semibold mb-2">
            PROCEDURE INTELLIGENCE
          </div>
          <h1 className="text-text-primary text-[28px] font-bold mb-2">
            Dubai Real Estate Transaction Guide
          </h1>
          <p className="text-text-secondary text-body leading-relaxed max-w-2xl">
            Know your rights. Know the costs. Know the process — before you sign.
          </p>
        </div>

        {/* Audience Filter */}
        <div className="mb-8">
          <AudienceFilter active={audienceFilter} onChange={setAudienceFilter} />
        </div>

        {/* Guide Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-surface border border-border rounded-lg p-6 animate-pulse">
                <div className="w-10 h-10 rounded-lg bg-text-dim/20 mb-4" />
                <div className="h-5 bg-text-dim/20 rounded mb-2 w-3/4" />
                <div className="h-4 bg-text-dim/10 rounded mb-4 w-full" />
                <div className="h-3 bg-text-dim/10 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {guides.map((g) => (
              <GuideCard key={g.id} guide={g} />
            ))}
          </div>
        )}

        {!loading && guides.length === 0 && (
          <div className="text-center py-16 text-text-dim">
            No guides found for this audience filter.
          </div>
        )}
      </div>
    </div>
  );
}
