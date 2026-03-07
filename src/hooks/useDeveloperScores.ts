import { useState, useEffect } from 'react';
import { gold } from '@/lib/supabase';
import type { DeveloperScore } from '@/types/database';

export function useDeveloperScores(developer?: string | null) {
  const [data, setData] = useState<DeveloperScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    gold().from('developer_scores')
      .select('*')
      .then(({ data: rows, error }) => {
        if (error) { setError(error.message); setLoading(false); return; }
        let filtered = (rows as DeveloperScore[]) || [];
        if (developer) filtered = filtered.filter(d => d.developer === developer);
        setData(filtered);
        setLoading(false);
      });
  }, [developer]);

  return { data, loading, error };
}
