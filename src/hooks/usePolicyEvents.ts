import { useState, useEffect } from 'react';
import { bronze } from '@/lib/supabase';
import type { PolicyEvent } from '@/types/database';

export function usePolicyEvents(limit = 20) {
  const [data, setData] = useState<PolicyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    bronze().from('policy_events')
      .select('*')
      .order('event_date', { ascending: false })
      .limit(limit)
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setData((data as PolicyEvent[]) || []);
        setLoading(false);
      });
  }, [limit]);

  return { data, loading, error };
}
