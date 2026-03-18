import { Clock, Scale, BookOpen } from 'lucide-react';
import type { TransactionGuide } from '@/types/procedure';

interface Props {
  guide: TransactionGuide;
  stepCount: number;
}

export function GuideHeader({ guide, stepCount }: Props) {
  return (
    <div className="mb-6">
      <div className="text-gold text-label tracking-[3px] uppercase font-semibold mb-2">
        PROCEDURE INTELLIGENCE
      </div>
      <h1 className="text-text-primary text-[24px] font-bold mb-2">{guide.title}</h1>
      <p className="text-text-secondary text-body mb-4">{guide.subtitle}</p>

      <div className="flex flex-wrap items-center gap-4 text-label text-text-dim">
        <span className="flex items-center gap-1.5">
          <BookOpen size={13} />
          {stepCount} Steps
        </span>
        {guide.estimated_timeline && (
          <span className="flex items-center gap-1.5">
            <Clock size={13} />
            {guide.estimated_timeline}
          </span>
        )}
        {guide.governing_authority && (
          <span className="flex items-center gap-1.5">
            <Scale size={13} />
            {guide.governing_authority}
          </span>
        )}
        {guide.relevant_law && (
          <span className="font-mono text-info text-label">
            {guide.relevant_law}
          </span>
        )}
      </div>
    </div>
  );
}
