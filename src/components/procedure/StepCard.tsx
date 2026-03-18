import { Lightbulb, User, MapPin, Clock } from 'lucide-react';
import type { GuideStep } from '@/types/procedure';

interface Props {
  step: GuideStep;
  totalSteps: number;
  isActive: boolean;
}

export function StepCard({ step, totalSteps, isActive }: Props) {
  return (
    <div
      id={`step-${step.step_number}`}
      className={`bg-surface border rounded-lg p-6 transition-colors ${
        isActive ? 'border-l-[3px] border-l-gold border-border' : 'border-border'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-text-dim text-label">
          STEP {step.step_number} of {totalSteps}
        </span>
        {step.is_optional && (
          <span className="text-label text-text-dim bg-text-dim/15 px-2 py-0.5 rounded">
            Optional
          </span>
        )}
      </div>

      <h3 className="text-text-primary text-[18px] font-bold mb-3">
        {step.step_title}
      </h3>

      <p className="text-text-secondary text-body leading-relaxed mb-4">
        {step.step_description}
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {step.responsible_party && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#131326] border border-border text-text-secondary text-[12px]">
            <User size={12} />
            {step.responsible_party.charAt(0).toUpperCase() + step.responsible_party.slice(1)}
          </span>
        )}
        {step.location_or_platform && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#131326] border border-border text-text-secondary text-[12px]">
            <MapPin size={12} />
            {step.location_or_platform}
          </span>
        )}
        {step.typical_duration && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#131326] border border-border text-text-secondary text-[12px]">
            <Clock size={12} />
            {step.typical_duration}
          </span>
        )}
      </div>

      {step.pro_tip && (
        <div className="bg-gold/8 border-l-[3px] border-l-gold rounded-r-lg p-4">
          <div className="flex items-center gap-1.5 text-gold text-[13px] font-semibold mb-1.5">
            <Lightbulb size={14} />
            PRO TIP
          </div>
          <p className="text-gold/90 text-[13px] leading-relaxed">
            {step.pro_tip}
          </p>
        </div>
      )}
    </div>
  );
}
