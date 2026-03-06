import { useToolStore } from '@/store/tools';
import { DealAudit } from './DealAudit';
import { FlipCalc } from './FlipCalc';
import { NetYieldCalc } from './NetYieldCalc';
import { HandoverImpact } from './HandoverImpact';
import { BlockingReport } from './BlockingReport';
import { CapitalRotation } from './CapitalRotation';
import { RenovateFlip } from './RenovateFlip';
import { X } from 'lucide-react';

const TOOL_COMPONENTS: Record<string, React.FC> = {
  'deal-audit': DealAudit,
  'flip-calc': FlipCalc,
  'net-yield': NetYieldCalc,
  'handover-impact': HandoverImpact,
  'blocking-report': BlockingReport,
  'capital-rotation': CapitalRotation,
  'renovate-flip': RenovateFlip,
};

const TOOL_TITLES: Record<string, string> = {
  'deal-audit': 'Deal Audit',
  'flip-calc': 'Flip Calculator',
  'net-yield': 'Net Yield Calculator',
  'handover-impact': 'Handover Impact',
  'blocking-report': 'Blocking Risk Report',
  'capital-rotation': 'Capital Rotation Tracker',
  'renovate-flip': 'Renovate + Flip ROI',
};

export function ToolDrawer() {
  const { isOpen, activeTool, close } = useToolStore();

  if (!isOpen || !activeTool) return null;

  const ToolComponent = TOOL_COMPONENTS[activeTool];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={close} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-screen w-[420px] bg-surface border-l border-border z-50 flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-subheading font-semibold">
            {TOOL_TITLES[activeTool] ?? activeTool}
          </h2>
          <button
            onClick={close}
            className="text-text-dim hover:text-text-primary transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {ToolComponent ? <ToolComponent /> : <p className="text-text-dim">Tool not found</p>}
        </div>
      </div>
    </>
  );
}
