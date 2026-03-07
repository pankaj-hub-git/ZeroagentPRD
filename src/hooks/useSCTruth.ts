import { useState, useEffect } from 'react';
import { gold } from '@/lib/supabase';
import type { SCTruth } from '@/types/database';

export function useSCTruth(community: string | null) {
  const [data, setData] = useState<SCTruth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!community) { setData([]); setLoading(false); return; }
    setLoading(true);
    gold().from('sc_truth_layer')
      .select('*')
      .ilike('phase_name', `%${community}%`)
      .order('phase_name')
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setData((data as SCTruth[]) || []);
        setLoading(false);
      });
  }, [community]);

  return { data, loading, error };
}
