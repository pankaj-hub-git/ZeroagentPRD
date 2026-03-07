import { useEffect, useState } from 'react';
import { sb } from '@/lib/supabase';

interface FilterOptions {
  areas: string[];
  projects: string[];
  developers: string[];
  loading: boolean;
}

export function useFilterOptions(): FilterOptions {
  const [areas, setAreas] = useState<string[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
  const [developers, setDevelopers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const [areaRes, projectRes, devRes] = await Promise.all([
        sb
          .schema('bronze').from('derived_project_registry')
          .select('area_name')
          .not('area_name', 'is', null)
          .order('area_name')
          .limit(500),
        sb
          .schema('bronze').from('derived_project_registry')
          .select('project_name')
          .not('project_name', 'is', null)
          .order('project_name')
          .limit(500),
        sb
          .schema('gold').from('phase_registry')
          .select('developer')
          .not('developer', 'is', null)
          .order('developer')
          .limit(500),
      ]);

      if (areaRes.error) console.error('[Filters] areas:', areaRes.error.message);
      if (projectRes.error) console.error('[Filters] projects:', projectRes.error.message);
      if (devRes.error) console.error('[Filters] developers:', devRes.error.message);

      const unique = (arr: Record<string, unknown>[], key: string): string[] =>
        [...new Set(arr.map((r) => r[key] as string).filter(Boolean))].sort();

      setAreas(unique(areaRes.data ?? [], 'area_name'));
      setProjects(unique(projectRes.data ?? [], 'project_name'));
      setDevelopers(unique(devRes.data ?? [], 'developer'));
      setLoading(false);
    };

    run();
  }, []);

  return { areas, projects, developers, loading };
}
