import { useState, useEffect } from 'react';
import { sb } from '@/lib/supabase';
import type { CrisisEvent } from '@/types/database';

export function useCrisisEvents() {
  const [data, setData] = useState<CrisisEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    sb.from('crisis_events')
      .select('*')
      .order('detected_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setData((data as CrisisEvent[]) || []);
        setLoading(false);
      });
  }, []);

  return { data, loading, error };
}
