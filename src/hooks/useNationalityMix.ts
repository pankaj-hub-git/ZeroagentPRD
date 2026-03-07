import { useState, useEffect } from 'react';
import { silver } from '@/lib/supabase';
import type { NationalityMix } from '@/types/database';

export function useNationalityMix(areaName: string | null) {
  const [data, setData] = useState<NationalityMix[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!areaName) { setData([]); setLoading(false); return; }
    setLoading(true);
    silver().from('dewa_nationality_mix')
      .select('*')
      .eq('canonical_area', areaName)
      .order('quarter_start', { ascending: false })
      .limit(4)
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setData((data as NationalityMix[]) || []);
        setLoading(false);
      });
  }, [areaName]);

  return { data, loading, error };
}
