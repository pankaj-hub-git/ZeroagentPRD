import { useState, useEffect } from 'react';
import { gold } from '@/lib/supabase';
import type { NationalityMomentum } from '@/types/database';

export function useNationalityMomentum() {
  const [data, setData] = useState<NationalityMomentum[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    gold().from('nationality_momentum')
      .select('*')
      .eq('is_reliable', true)
      .order('quarter', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setData((data as NationalityMomentum[]) || []);
        setLoading(false);
      });
  }, []);

  return { data, loading, error };
}
