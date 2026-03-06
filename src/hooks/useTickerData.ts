import { useEffect, useState } from 'react';
import { sb } from '@/lib/supabase';

export interface TickerItem {
  id: string;
  description: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  date: string;
}

export function useTickerData() {
  const [items, setItems] = useState<TickerItem[]>([]);

  useEffect(() => {
    const run = async () => {
      const { data } = await sb
        .from('bronze.policy_events')
        .select('event_date, event_type, description, impact_level')
        .order('event_date', { ascending: false })
        .limit(15);

      if (data) {
        setItems(
          data.map((r: Record<string, unknown>, i: number) => ({
            id: `tick-${i}`,
            description: (r.description as string) ?? (r.event_type as string) ?? '',
            impact: (r.impact_level as TickerItem['impact']) ?? 'LOW',
            date: r.event_date as string,
          }))
        );
      }
    };
    run();
  }, []);

  return items;
}
