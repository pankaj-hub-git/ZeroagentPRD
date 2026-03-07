import { useEffect, useState } from 'react';
import { sb } from '@/lib/supabase';

export interface TickerItem {
  id: string;
  label: string;
  description: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  type: 'POLICY' | 'CAPITAL' | 'GOVT';
}

export function useTickerData() {
  const [items, setItems] = useState<TickerItem[]>([]);

  useEffect(() => {
    const run = async () => {
      const [policyRes, safeHavenRes, govRes] = await Promise.all([
        sb
          .schema('bronze').from('policy_events')
          .select('event_name, policy_type, direction')
          .order('event_date', { ascending: false })
          .limit(5),
        sb
          .schema('bronze').from('safe_haven_catalysts')
          .select('event_name, severity, capital_flow_direction')
          .order('event_date', { ascending: false })
          .limit(5),
        sb
          .from('bronze_government_catalysts')
          .select('catalyst_name, catalyst_type, current_status')
          .order('announced_date', { ascending: false })
          .limit(5),
      ]);

      const result: TickerItem[] = [];

      (policyRes.data ?? []).forEach((r: Record<string, unknown>, i: number) => {
        const dir = r.direction as string;
        const badge = dir === 'bearish' ? '🔴' : dir === 'bullish' ? '🟢' : '';
        result.push({
          id: `pol-${i}`,
          label: 'POLICY',
          description: `${r.event_name ?? r.policy_type ?? 'Policy Event'} ${badge}`,
          impact: dir === 'bearish' ? 'HIGH' : dir === 'bullish' ? 'LOW' : 'MEDIUM',
          type: 'POLICY',
        });
      });

      (safeHavenRes.data ?? []).forEach((r: Record<string, unknown>, i: number) => {
        const sev = (r.severity as number) ?? 0;
        result.push({
          id: `sh-${i}`,
          label: 'CAPITAL',
          description: `${r.event_name ?? 'Capital Flow'} · Severity ${sev}/5`,
          impact: sev >= 4 ? 'HIGH' : sev >= 2 ? 'MEDIUM' : 'LOW',
          type: 'CAPITAL',
        });
      });

      (govRes.data ?? []).forEach((r: Record<string, unknown>, i: number) => {
        result.push({
          id: `gov-${i}`,
          label: 'GOVT',
          description: `${r.catalyst_name ?? 'Catalyst'}`,
          impact: 'MEDIUM',
          type: 'GOVT',
        });
      });

      setItems(result);
    };
    run();
  }, []);

  return items;
}
