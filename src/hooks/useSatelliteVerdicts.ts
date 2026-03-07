import { useState, useEffect } from 'react';
import { gold } from '@/lib/supabase';
import type { SatelliteVerdict } from '@/types/database';

export function useSatelliteVerdicts(community?: string | null, developer?: string | null) {
  const [data, setData] = useState<SatelliteVerdict[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!community && !developer) { setData([]); setLoading(false); return; }
    setLoading(true);
    let query = gold().from('satellite_verdicts').select('*');
    if (community) query = query.ilike('community_name', community);
    if (developer) query = query.ilike('master_developer', developer);
    query.then(({ data, error }) => {
      if (error) setError(error.message);
      else setData((data as SatelliteVerdict[]) || []);
      setLoading(false);
    });
  }, [community, developer]);

  return { data, loading, error };
}
