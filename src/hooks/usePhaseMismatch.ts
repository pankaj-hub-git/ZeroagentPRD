import { useState, useEffect } from 'react';
import { gold } from '@/lib/supabase';
import type { PhaseMismatch } from '@/types/database';

export function usePhaseMismatch(masterCommunity: string | null) {
  const [data, setData] = useState<PhaseMismatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!masterCommunity) { setData([]); setLoading(false); return; }
    setLoading(true);
    gold().from('phase_mismatch')
      .select('*')
      .eq('master_community', masterCommunity)
      .order('premium_to_ready_pct', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setData((data as PhaseMismatch[]) || []);
        setLoading(false);
      });
  }, [masterCommunity]);

  return { data, loading, error };
}
