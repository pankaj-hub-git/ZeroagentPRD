import { useState, useEffect } from 'react';
import { bronze } from '@/lib/supabase';
import type { MollakServiceCharge } from '@/types/database';

export function useMollakHistory(projectName: string | null) {
  const [data, setData] = useState<MollakServiceCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectName) { setData([]); setLoading(false); return; }
    setLoading(true);
    bronze().from('mollak_service_charges')
      .select('project_name_en, budget_year, service_charge_sqft, general_fund_sqft, reserve_fund_sqft, total_sqft')
      .ilike('project_name_en', `%${projectName}%`)
      .order('budget_year', { ascending: true })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setData((data as MollakServiceCharge[]) || []);
        setLoading(false);
      });
  }, [projectName]);

  return { data, loading, error };
}
