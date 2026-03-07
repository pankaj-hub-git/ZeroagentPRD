import { useState, useEffect } from 'react';
import { gold } from '@/lib/supabase';
import type { ViewBlocking } from '@/types/database';

export function useViewBlocking(observerProject: string | null) {
  const [data, setData] = useState<ViewBlocking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!observerProject) { setData([]); setLoading(false); return; }
    setLoading(true);
    gold().from('view_blocking_v3')
      .select('*')
      .ilike('observer_project', observerProject)
      .order('risk_score', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setData((data as ViewBlocking[]) || []);
        setLoading(false);
      });
  }, [observerProject]);

  return { data, loading, error };
}
