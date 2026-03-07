import { useEffect, useState } from 'react';
import { sb } from '@/lib/supabase';

export interface FeedItem {
  id: string;
  category: 'policy' | 'macro' | 'safe_haven' | 'government' | 'crisis';
  title: string;
  summary: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  date: string;
  source: string;
}

function mapPolicy(row: Record<string, unknown>): FeedItem {
  return {
    id: `pol-${row.id ?? row.event_date}`,
    category: 'policy',
    title: (row.event_type as string) ?? 'Policy Event',
    summary: (row.description as string) ?? '',
    impact: (row.impact_level as FeedItem['impact']) ?? 'MEDIUM',
    date: row.event_date as string,
    source: 'Government Records',
  };
}

function mapMacro(row: Record<string, unknown>): FeedItem {
  return {
    id: `mac-${row.id ?? row.date}`,
    category: 'macro',
    title: (row.indicator as string) ?? 'Macro Signal',
    summary: (row.description as string) ?? `${row.indicator}: ${row.value}`,
    impact: 'MEDIUM',
    date: row.date as string,
    source: 'Macro Intelligence',
  };
}

function mapSafeHaven(row: Record<string, unknown>): FeedItem {
  return {
    id: `sh-${row.id ?? row.date}`,
    category: 'safe_haven',
    title: (row.catalyst as string) ?? 'Safe Haven Event',
    summary: (row.description as string) ?? '',
    impact: (row.impact_level as FeedItem['impact']) ?? 'MEDIUM',
    date: row.date as string,
    source: 'Geopolitical Analysis',
  };
}

function mapGovernment(row: Record<string, unknown>): FeedItem {
  return {
    id: `gov-${row.id ?? row.date}`,
    category: 'government',
    title: (row.catalyst_type as string) ?? 'Government Catalyst',
    summary: (row.description as string) ?? '',
    impact: (row.impact_level as FeedItem['impact']) ?? 'MEDIUM',
    date: row.date as string,
    source: 'Government Intelligence',
  };
}

function mapCrisis(row: Record<string, unknown>): FeedItem {
  return {
    id: `cri-${row.id ?? row.detected_at}`,
    category: 'crisis',
    title: 'Crisis Alert',
    summary: (row.description as string) ?? (row.alert_type as string) ?? '',
    impact: 'HIGH',
    date: row.detected_at as string,
    source: 'Crisis Monitoring',
  };
}

export function useFeedData() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const [policy, macro, safeHaven, government, crisis] = await Promise.all([
        sb
          .schema('bronze').from('policy_events')
          .select('*')
          .order('event_date', { ascending: false })
          .limit(50),
        sb
          .schema('bronze').from('uae_macro')
          .select('*')
          .order('date', { ascending: false })
          .limit(20),
        sb
          .schema('bronze').from('safe_haven_catalysts')
          .select('*')
          .order('date', { ascending: false })
          .limit(20),
        sb
          .from('bronze_government_catalysts')
          .select('*')
          .order('date', { ascending: false })
          .limit(30),
        sb
          .from('crisis_events')
          .select('*')
          .order('detected_at', { ascending: false }),
      ]);

      // Log any Supabase errors for debugging
      const sources = { policy, macro, safeHaven, government, crisis };
      for (const [name, res] of Object.entries(sources)) {
        if (res.error) console.error(`[Feed] ${name} query failed:`, res.error.message);
      }

      const all: FeedItem[] = [
        ...(policy.data ?? []).map(mapPolicy),
        ...(macro.data ?? []).map(mapMacro),
        ...(safeHaven.data ?? []).map(mapSafeHaven),
        ...(government.data ?? []).map(mapGovernment),
        ...(crisis.data ?? [])
          .filter((r: Record<string, unknown>) => {
            const sev = r.severity as string;
            return !sev || sev === 'MODERATE' || sev === 'HIGH' || sev === 'CRITICAL';
          })
          .map(mapCrisis),
      ];

      all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setItems(all);
      setLoading(false);
    };

    run();
  }, []);

  return { items, loading };
}
