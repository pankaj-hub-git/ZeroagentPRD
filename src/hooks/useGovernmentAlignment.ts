import { useState, useEffect } from 'react';
import { gold } from '@/lib/supabase';
import type { GovernmentAlignment } from '@/types/database';

export function useGovernmentAlignment(community: string | null) {
  const [data, setData] = useState<GovernmentAlignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!community) { setData(null); setLoading(false); return; }
    setLoading(true);
    gold().from('government_alignment')
      .select('*')
      .ilike('master_community', community)
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setData(data as GovernmentAlignment | null);
        setLoading(false);
      });
  }, [community]);

  return { data, loading, error };
}
