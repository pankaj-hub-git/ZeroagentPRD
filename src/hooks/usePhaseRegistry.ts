import { useState, useEffect } from 'react';
import { gold } from '@/lib/supabase';
import type { PhaseRegistry } from '@/types/database';

export function usePhaseRegistry(masterProject: string | null) {
  const [data, setData] = useState<PhaseRegistry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!masterProject) { setData([]); setLoading(false); return; }
    setLoading(true);
    gold().from('phase_registry')
      .select('*')
      .eq('master_project_en', masterProject)
      .order('launch_date', { ascending: true })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setData((data as PhaseRegistry[]) || []);
        setLoading(false);
      });
  }, [masterProject]);

  return { data, loading, error };
}
