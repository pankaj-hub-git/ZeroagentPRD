import { useNavigate } from 'react-router-dom';
import {
  Building2, Key, BadgeDollarSign, ArrowRightLeft, Home, Landmark,
  Wallet, FileCheck, RefreshCw, Gift, Gavel, ShieldCheck, FileSignature,
  Clock, DollarSign, Scale, type LucideIcon,
} from 'lucide-react';
import type { TransactionGuide } from '@/types/procedure';

const iconMap: Record<string, LucideIcon> = {
  buy_offplan: Building2,
  buy_resale: Key,
  sell_ready: BadgeDollarSign,
  sell_offplan: ArrowRightLeft,
  rent_tenant: Home,
  rent_landlord: Landmark,
  mortgage: Wallet,
  ejari_new: FileCheck,
  ejari_renew: RefreshCw,
  gift_transfer: Gift,
  rera_dispute: Gavel,
  oqood_registration: ShieldCheck,
  noc_process: FileSignature,
};

const audienceBadge: Record<string, { label: string; color: string }> = {
  buyer: { label: 'BUYER', color: 'text-verified bg-verified/15' },
  seller: { label: 'SELLER', color: 'text-warn bg-warn/15' },
  tenant: { label: 'TENANT', color: 'text-info bg-info/15' },
  landlord: { label: 'LANDLORD', color: 'text-warn bg-warn/15' },
  investor: { label: 'INVESTOR', color: 'text-gold bg-gold/15' },
  all: { label: 'ALL PARTIES', color: 'text-text-dim bg-text-dim/15' },
};

interface Props {
  guide: TransactionGuide;
}

export function GuideCard({ guide }: Props) {
  const navigate = useNavigate();
  const Icon = iconMap[guide.guide_type] ?? Scale;
  const badge = audienceBadge[guide.target_audience] ?? audienceBadge.all;

  return (
    <div
      onClick={() => navigate(`/procedure/${guide.guide_type}`)}
      className="bg-surface border border-border rounded-lg p-6 cursor-pointer transition-all duration-200 hover:border-gold/30 group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
          <Icon size={20} className="text-gold" />
        </div>
        <span className={`text-micro font-semibold px-2 py-0.5 rounded ${badge.color}`}>
          {badge.label}
        </span>
      </div>

      <h3 className="text-text-primary text-subheading font-bold mb-1 group-hover:text-gold transition-colors">
        {guide.title}
      </h3>
      <p className="text-text-secondary text-[13px] mb-4 line-clamp-2">
        {guide.subtitle}
      </p>

      <div className="flex flex-wrap items-center gap-3 text-label text-text-dim mb-4">
        {guide.estimated_timeline && (
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {guide.estimated_timeline}
          </span>
        )}
        {guide.total_estimated_cost_pct != null && (
          <span className="flex items-center gap-1">
            <DollarSign size={12} />
            ~{guide.total_estimated_cost_pct}% of value
          </span>
        )}
      </div>

      {guide.governing_authority && (
        <div className="text-label text-text-dim flex items-center gap-1">
          <Scale size={12} />
          {guide.governing_authority}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-border">
        <span className="text-gold text-[13px] font-medium group-hover:underline">
          View Full Guide &rarr;
        </span>
      </div>
    </div>
  );
}
