import { useState, useEffect } from 'react';
import { sb } from '@/lib/supabase';
import type { NavCommunity } from '@/types/database';

export function useNavigation() {
  const [data, setData] = useState<NavCommunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    sb.from('navigation_hierarchy')
      .select('*')
      .order('area_name')
      .order('community_display_name')
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setData((data as NavCommunity[]) || []);
        setLoading(false);
      });
  }, []);

  return { data, loading, error };
}
