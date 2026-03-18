import type { AudienceFilter as FilterType } from '@/types/procedure';

const filters: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'buyer', label: 'Buyers' },
  { value: 'seller', label: 'Sellers' },
  { value: 'tenant', label: 'Tenants' },
  { value: 'landlord', label: 'Landlords' },
];

interface Props {
  active: FilterType;
  onChange: (filter: FilterType) => void;
}

export function AudienceFilter({ active, onChange }: Props) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {filters.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={`px-4 py-1.5 rounded-full text-label font-medium border transition-colors duration-200 ${
            active === f.value
              ? 'bg-gold/15 text-gold border-gold'
              : 'bg-[#131326] text-text-secondary border-border hover:border-gold/30 hover:text-text-primary'
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
