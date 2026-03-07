import { useState, useEffect } from 'react';
import { gold } from '@/lib/supabase';
import type { RentalYield } from '@/types/database';

export function useRentalYield(areaName: string | null) {
  const [data, setData] = useState<RentalYield[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!areaName) { setData([]); setLoading(false); return; }
    setLoading(true);
    gold().from('rental_yield')
      .select('*')
      .eq('area_name', areaName)
      .order('period_start', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setData((data as RentalYield[]) || []);
        setLoading(false);
      });
  }, [areaName]);

  return { data, loading, error };
}
