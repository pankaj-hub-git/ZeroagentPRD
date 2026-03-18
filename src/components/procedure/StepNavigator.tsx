import { ArrowLeft, DollarSign, FileText, Scale, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { TransactionGuide, GuideStep, ProcedureSubTab } from '@/types/procedure';

interface Props {
  guide: TransactionGuide;
  steps: GuideStep[];
  activeStep: number;
  onStepClick: (step: number) => void;
  onQuickLink: (tab: ProcedureSubTab) => void;
}

export function StepNavigator({ guide, steps, activeStep, onStepClick, onQuickLink }: Props) {
  const navigate = useNavigate();

  return (
    <div className="w-[280px] shrink-0 border-r border-border bg-surface h-full overflow-y-auto hidden lg:block">
      <div className="p-5">
        <button
          onClick={() => navigate('/procedure')}
          className="flex items-center gap-1.5 text-text-secondary text-label hover:text-text-primary transition-colors mb-5"
        >
          <ArrowLeft size={14} />
          Back to Procedures
        </button>

        <div className="text-gold text-label tracking-[2px] uppercase font-semibold mb-1">
          {guide.title}
        </div>
        <div className="text-text-dim text-label mb-5">
          {steps.length} Steps · {guide.estimated_timeline}
        </div>

        <div className="space-y-1 mb-6">
          {steps.map((s) => (
            <button
              key={s.step_number}
              onClick={() => onStepClick(s.step_number)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-left text-[13px] transition-colors ${
                activeStep === s.step_number
                  ? 'text-gold bg-gold/8'
                  : 'text-text-dim hover:text-text-secondary hover:bg-white/3'
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 border ${
                  activeStep === s.step_number
                    ? 'bg-gold border-gold'
                    : s.is_optional
                    ? 'border-dashed border-text-dim'
                    : 'border-text-dim'
                }`}
              />
              <span className={`truncate ${s.is_optional ? 'italic' : ''}`}>
                {s.step_number}. {s.step_title}
              </span>
            </button>
          ))}
        </div>

        <div className="border-t border-border pt-4">
          <div className="text-text-dim text-label tracking-[2px] uppercase font-semibold mb-3">
            QUICK LINKS
          </div>
          <div className="space-y-1">
            <button onClick={() => onQuickLink('costs')} className="w-full flex items-center gap-2 px-3 py-1.5 text-text-secondary text-[13px] hover:text-text-primary hover:bg-white/3 rounded transition-colors">
              <DollarSign size={14} /> All Costs
            </button>
            <button onClick={() => onQuickLink('documents')} className="w-full flex items-center gap-2 px-3 py-1.5 text-text-secondary text-[13px] hover:text-text-primary hover:bg-white/3 rounded transition-colors">
              <FileText size={14} /> All Documents
            </button>
            <button onClick={() => onQuickLink('rights')} className="w-full flex items-center gap-2 px-3 py-1.5 text-text-secondary text-[13px] hover:text-text-primary hover:bg-white/3 rounded transition-colors">
              <Scale size={14} /> Rights & Duties
            </button>
            <button onClick={() => onQuickLink('warnings')} className="w-full flex items-center gap-2 px-3 py-1.5 text-text-secondary text-[13px] hover:text-text-primary hover:bg-white/3 rounded transition-colors">
              <AlertTriangle size={14} /> Warnings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
