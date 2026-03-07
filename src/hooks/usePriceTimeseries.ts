import { useState, useEffect } from 'react';
import { silver } from '@/lib/supabase';
import type { PriceTimeseries } from '@/types/database';

export function usePriceTimeseries(areaName: string | null) {
  const [data, setData] = useState<PriceTimeseries[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!areaName) { setData([]); setLoading(false); return; }
    setLoading(true);
    silver().from('price_timeseries')
      .select('*')
      .eq('area_name', areaName)
      .eq('period_type', 'quarterly')
      .order('period_start', { ascending: false })
      .limit(8)
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setData((data as PriceTimeseries[]) || []);
        setLoading(false);
      });
  }, [areaName]);

  return { data, loading, error };
}
