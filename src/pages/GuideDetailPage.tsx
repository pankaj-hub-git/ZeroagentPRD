import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useGuideDetail } from '@/hooks/useProcedureData';
import { useProcedureStore } from '@/store/procedure';
import { GuideHeader } from '@/components/procedure/GuideHeader';
import { StepNavigator } from '@/components/procedure/StepNavigator';
import { StepCard } from '@/components/procedure/StepCard';
import { CostCalculator } from '@/components/procedure/CostCalculator';
import { DocumentList } from '@/components/procedure/DocumentList';
import { RightsDutiesView } from '@/components/procedure/RightsDutiesView';
import { WarningList } from '@/components/procedure/WarningCard';
import type { ProcedureSubTab } from '@/types/procedure';

const subTabs: { key: ProcedureSubTab; label: string }[] = [
  { key: 'steps', label: 'Steps' },
  { key: 'costs', label: 'Costs' },
  { key: 'documents', label: 'Documents' },
  { key: 'rights', label: 'Rights & Duties' },
  { key: 'warnings', label: 'Warnings' },
];

export function GuideDetailPage() {
  const { guideType } = useParams<{ guideType: string }>();
  const navigate = useNavigate();
  const { activeSubTab, setActiveSubTab, activeStepNumber, setActiveStepNumber } = useProcedureStore();
  const { guide, steps, costs, documents, rights, warnings, loading } = useGuideDetail(guideType);

  const handleStepClick = (stepNum: number) => {
    setActiveStepNumber(stepNum);
    setActiveSubTab('steps');
    setTimeout(() => {
      document.getElementById(`step-${stepNum}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  };

  const handleQuickLink = (tab: ProcedureSubTab) => {
    setActiveSubTab(tab);
  };

  if (loading) {
    return (
      <div className="h-full flex">
        {/* Skeleton sidebar */}
        <div className="w-[280px] shrink-0 border-r border-border bg-surface hidden lg:block p-5">
          <div className="h-4 bg-text-dim/20 rounded w-2/3 mb-4 animate-pulse" />
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-3 bg-text-dim/10 rounded animate-pulse" />
            ))}
          </div>
        </div>
        {/* Skeleton content */}
        <div className="flex-1 p-6">
          <div className="h-6 bg-text-dim/20 rounded w-1/2 mb-4 animate-pulse" />
          <div className="h-4 bg-text-dim/10 rounded w-3/4 mb-8 animate-pulse" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-surface border border-border rounded-lg p-6 animate-pulse">
                <div className="h-5 bg-text-dim/20 rounded w-1/3 mb-3" />
                <div className="h-3 bg-text-dim/10 rounded w-full mb-2" />
                <div className="h-3 bg-text-dim/10 rounded w-2/3" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-text-secondary text-body mb-4">Guide not found.</p>
          <button
            onClick={() => navigate('/procedure')}
            className="text-gold text-body hover:underline"
          >
            Back to Procedures
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Left sidebar — step navigator (desktop) */}
      <StepNavigator
        guide={guide}
        steps={steps}
        activeStep={activeStepNumber}
        onStepClick={handleStepClick}
        onQuickLink={handleQuickLink}
      />

      {/* Right panel */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-6">
          {/* Mobile back button */}
          <button
            onClick={() => navigate('/procedure')}
            className="flex items-center gap-1.5 text-text-secondary text-label hover:text-text-primary transition-colors mb-4 lg:hidden"
          >
            <ArrowLeft size={14} />
            Back to Procedures
          </button>

          <GuideHeader guide={guide} stepCount={steps.length} />

          {/* Mobile step scroller */}
          <div className="flex lg:hidden overflow-x-auto gap-2 mb-4 pb-2">
            {steps.map((s) => (
              <button
                key={s.step_number}
                onClick={() => handleStepClick(s.step_number)}
                className={`shrink-0 px-3 py-1 rounded-full text-label border transition-colors ${
                  activeStepNumber === s.step_number
                    ? 'bg-gold/15 text-gold border-gold'
                    : 'text-text-dim border-border'
                }`}
              >
                {s.step_number}
              </button>
            ))}
          </div>

          {/* Sub-tabs */}
          <div className="flex items-center gap-1 border-b border-border mb-6 overflow-x-auto">
            {subTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveSubTab(tab.key)}
                className={`za-subtab ${activeSubTab === tab.key ? 'active' : ''}`}
              >
                {tab.label}
                {tab.key === 'warnings' && warnings.length > 0 && (
                  <span className="ml-1.5 text-micro bg-danger/20 text-danger px-1.5 py-0.5 rounded-full">
                    {warnings.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="transition-opacity duration-150">
            {activeSubTab === 'steps' && (
              <div className="space-y-4">
                {steps.map((s) => (
                  <StepCard
                    key={s.id}
                    step={s}
                    totalSteps={steps.length}
                    isActive={activeStepNumber === s.step_number}
                  />
                ))}
              </div>
            )}

            {activeSubTab === 'costs' && <CostCalculator costs={costs} />}

            {activeSubTab === 'documents' && <DocumentList documents={documents} />}

            {activeSubTab === 'rights' && <RightsDutiesView rights={rights} />}

            {activeSubTab === 'warnings' && <WarningList warnings={warnings} />}
          </div>

          {/* Description footer */}
          {guide.description && (
            <div className="mt-8 p-5 bg-surface border border-border rounded-lg">
              <div className="text-text-dim text-label tracking-[2px] uppercase font-semibold mb-2">
                OVERVIEW
              </div>
              <p className="text-text-secondary text-body leading-relaxed">
                {guide.description}
              </p>
              {guide.relevant_law && (
                <div className="mt-3 text-info text-label font-mono">
                  Source: {guide.governing_authority} · {guide.relevant_law}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
