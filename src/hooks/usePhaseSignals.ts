import { useState, useEffect } from 'react';
import { gold } from '@/lib/supabase';
import type { PhaseSignal } from '@/types/database';

export function usePhaseSignals(masterProject: string | null) {
  const [data, setData] = useState<PhaseSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!masterProject) { setData([]); setLoading(false); return; }
    setLoading(true);
    gold().from('phase_signals')
      .select('*')
      .eq('master_project_en', masterProject)
      .order('signal_score', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setData((data as PhaseSignal[]) || []);
        setLoading(false);
      });
  }, [masterProject]);

  return { data, loading, error };
}
