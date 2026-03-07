import { useState, useEffect } from 'react';
import { gold } from '@/lib/supabase';
import type { TruthLayer } from '@/types/database';

export function useTruthLayer(project: string | null) {
  const [data, setData] = useState<TruthLayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!project) { setData([]); setLoading(false); return; }
    setLoading(true);
    gold().from('truth_layer')
      .select('*')
      .ilike('dld_master_project', `%${project}%`)
      .limit(50)
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setData((data as TruthLayer[]) || []);
        setLoading(false);
      });
  }, [project]);

  return { data, loading, error };
}
