import { useEffect, useState } from 'react';
import { sb } from '@/lib/supabase';
import { SQM_TO_SQFT } from '@/lib/constants';

export interface XrayProject {
  id: string;
  projectName: string;
  developer: string;
  completionDate: string;
  totalFloors: number;
  community: string;
}

export interface XrayUnitType {
  unitType: string;
  totalAreaSqft: number;
  unitsPerFloor: number;
  orientation: string;
  floorPlanLayout: Record<string, unknown>;
}

export interface DLDTransaction {
  date: string;
  worth: number;
  areaSqft: number;
  psfSqft: number;
  transType: string;
  unitType: string;
}

export function useXrayData(projectId: string | null) {
  const [project, setProject] = useState<XrayProject | null>(null);
  const [unitTypes, setUnitTypes] = useState<XrayUnitType[]>([]);
  const [transactions, setTransactions] = useState<DLDTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);

    const run = async () => {
      // Step 1: fetch project + unit types (these use the UUID)
      const [projRes, unitRes] = await Promise.all([
        sb
          .from('xray_projects')
          .select('id, project_name, developer, completion_date, total_floors, master_community')
          .eq('id', projectId)
          .single(),
        sb
          .from('xray_unit_types')
          .select('unit_type, total_area_sqft, units_per_floor, orientation, floor_plan_layout')
          .eq('project_id', projectId),
      ]);

      if (projRes.data) {
        const p = projRes.data as Record<string, unknown>;
        setProject({
          id: p.id as string,
          projectName: (p.project_name as string) ?? '',
          developer: (p.developer as string) ?? '',
          completionDate: (p.completion_date as string) ?? '',
          totalFloors: (p.total_floors as number) ?? 0,
          community: (p.master_community as string) ?? '',
        });

        // Step 2: fetch DLD transactions using the project NAME (not UUID)
        const projectName = (p.project_name as string) ?? '';
        if (projectName) {
          const txnRes = await sb
            .schema('bronze').from('dld_transactions')
            .select('instance_date, actual_worth, procedure_area, meter_sale_price, trans_group_en, property_type_en')
            .ilike('project_name_en', `%${projectName}%`)
            .eq('trans_group_en', 'Sales')
            .order('instance_date', { ascending: false })
            .limit(200);

          if (txnRes.data) {
            setTransactions(
              txnRes.data.map((r: Record<string, unknown>) => ({
                date: (r.instance_date as string) ?? '',
                worth: (r.actual_worth as number) ?? 0,
                areaSqft: ((r.procedure_area as number) ?? 0) * SQM_TO_SQFT,
                psfSqft: ((r.meter_sale_price as number) ?? 0) / SQM_TO_SQFT,
                transType: (r.trans_group_en as string) ?? '',
                unitType: (r.property_type_en as string) ?? '',
              }))
            );
          }
        }
      }

      if (unitRes.data) {
        setUnitTypes(
          unitRes.data.map((r: Record<string, unknown>) => ({
            unitType: (r.unit_type as string) ?? '',
            totalAreaSqft: (r.total_area_sqft as number) ?? 0,
            unitsPerFloor: (r.units_per_floor as number) ?? 0,
            orientation: (r.orientation as string) ?? '',
            floorPlanLayout: (r.floor_plan_layout as Record<string, unknown>) ?? {},
          }))
        );
      }

      setLoading(false);
    };
    run();
  }, [projectId]);

  return { project, unitTypes, transactions, loading };
}
