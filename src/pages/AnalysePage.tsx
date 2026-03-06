import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useNavStore } from '@/store/navigation';
import { OverviewTab } from '@/components/analyse/OverviewTab';
import { PhaseTab } from '@/components/analyse/PhaseTab';
import { BlockingTab } from '@/components/analyse/BlockingTab';
import { SCTab } from '@/components/analyse/SCTab';
import { HandoverTab } from '@/components/analyse/HandoverTab';
import { DeveloperTab } from '@/components/analyse/DeveloperTab';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'phase', label: 'Phase Intelligence' },
  { key: 'blocking', label: 'Blocking Engine' },
  { key: 'sc', label: 'Service Charges' },
  { key: 'handover', label: 'Handover Predictor' },
  { key: 'developer', label: 'Developer Truth' },
];

export function AnalysePage() {
  const { subject } = useParams<{ subject: string }>();
  const { activeTab, setActiveTab, setActiveCommunity, activeCommunity } = useNavStore();

  useEffect(() => {
    if (subject) {
      setActiveCommunity(subject.replace(/-/g, ' '));
    }
  }, [subject, setActiveCommunity]);

  const displayName = activeCommunity ?? subject?.replace(/-/g, ' ') ?? 'Select a Community';

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-heading font-semibold">{displayName}</h1>
        <p className="text-body text-text-secondary">
          Deep intelligence analysis across 6 dimensions
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 border-b border-border pb-px">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-body font-medium transition-colors border-b-2 -mb-px ${
              activeTab === t.key
                ? 'border-gold text-gold'
                : 'border-transparent text-text-dim hover:text-text-secondary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'phase' && <PhaseTab />}
      {activeTab === 'blocking' && <BlockingTab />}
      {activeTab === 'sc' && <SCTab />}
      {activeTab === 'handover' && <HandoverTab />}
      {activeTab === 'developer' && <DeveloperTab developer={null} />}
    </div>
  );
}
