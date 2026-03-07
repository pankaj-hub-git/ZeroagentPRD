import { useState, useEffect } from 'react';
import { gold } from '@/lib/supabase';
import type { CapitalRotation } from '@/types/database';

export function useCapitalRotation(areaName: string | null) {
  const [data, setData] = useState<CapitalRotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const query = areaName
      ? gold().from('capital_rotation_quarterly')
          .select('*')
          .eq('area_name_en', areaName)
          .order('quarter', { ascending: false })
          .limit(8)
      : gold().from('capital_rotation_quarterly')
          .select('*')
          .order('total_value_aed', { ascending: false })
          .limit(50);
    query.then(({ data, error }) => {
      if (error) setError(error.message);
      else setData((data as CapitalRotation[]) || []);
      setLoading(false);
    });
  }, [areaName]);

  return { data, loading, error };
}
