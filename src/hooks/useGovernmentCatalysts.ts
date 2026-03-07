import { useState, useEffect } from 'react';
import { sb } from '@/lib/supabase';
import type { GovernmentCatalyst } from '@/types/database';

export function useGovernmentCatalysts(limit = 30) {
  const [data, setData] = useState<GovernmentCatalyst[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    sb.from('bronze_government_catalysts')
      .select('*')
      .order('announced_date', { ascending: false })
      .limit(limit)
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setData((data as GovernmentCatalyst[]) || []);
        setLoading(false);
      });
  }, [limit]);

  return { data, loading, error };
}
