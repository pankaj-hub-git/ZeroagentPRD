import { useState, useEffect } from 'react';
import { gold } from '@/lib/supabase';
import type { SCTrajectory } from '@/types/database';

export function useSCTrajectory(projectName: string | null) {
  const [data, setData] = useState<SCTrajectory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectName) { setData([]); setLoading(false); return; }
    setLoading(true);
    gold().from('sc_trajectory')
      .select('*')
      .ilike('project_name_en', `%${projectName}%`)
      .order('budget_year', { ascending: true })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setData((data as SCTrajectory[]) || []);
        setLoading(false);
      });
  }, [projectName]);

  return { data, loading, error };
}
