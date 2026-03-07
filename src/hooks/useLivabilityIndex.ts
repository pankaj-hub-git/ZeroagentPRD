import { useState, useEffect } from 'react';
import { gold } from '@/lib/supabase';
import type { LivabilityIndex } from '@/types/database';

export function useLivabilityIndex(community: string | null) {
  const [data, setData] = useState<LivabilityIndex[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!community) { setData([]); setLoading(false); return; }
    setLoading(true);
    gold().from('livability_index')
      .select('plot_number, livability_score, livability_grade, view_score, amenity_score, transit_score, construction_disruption, supply_pressure')
      .limit(500)
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setData((data as LivabilityIndex[]) || []);
        setLoading(false);
      });
  }, [community]);

  return { data, loading, error };
}
