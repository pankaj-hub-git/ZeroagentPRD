import { useEffect, useState } from 'react';
import { sb } from '@/lib/supabase';
import { SQM_TO_SQFT } from '@/lib/constants';

export interface KpiCard {
  label: string;
  value: string;
  sub?: string;
}

export interface MonthlyVolume {
  month: string;
  count: number;
  valueBn: number;
}

export interface BedroomTrend {
  month: string;
  Studio?: number;
  '1 B/R'?: number;
  '2 B/R'?: number;
  '3 B/R'?: number;
}

export interface AreaPsf {
  area: string;
  psf: number;
  count: number;
}

export interface RentalYield {
  area: string;
  grossYield: number;
}

export interface PhaseMismatch {
  phaseName: string;
  masterProject: string;
  mismatchLabel: string;
  readyPsf: number;
  offplanPsf: number;
  premiumPct: number;
}

interface MarketData {
  kpis: KpiCard[];
  monthlyVolume: MonthlyVolume[];
  bedroomTrend: BedroomTrend[];
  top12Areas: AreaPsf[];
  rentalYields: RentalYield[];
  eibor: { date: string; [k: string]: unknown }[];
  phaseMismatch: PhaseMismatch[];
  loading: boolean;
}

export function useMarketData(): MarketData {
  const [kpis, setKpis] = useState<KpiCard[]>([]);
  const [monthlyVolume, setMonthlyVolume] = useState<MonthlyVolume[]>([]);
  const [bedroomTrend, setBedroomTrend] = useState<BedroomTrend[]>([]);
  const [top12Areas, setTop12Areas] = useState<AreaPsf[]>([]);
  const [rentalYields, setRentalYields] = useState<RentalYield[]>([]);
  const [eibor, setEibor] = useState<{ date: string; [k: string]: unknown }[]>([]);
  const [phaseMismatch, setPhaseMismatch] = useState<PhaseMismatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const [txnRes, yieldRes, eiborRes, phaseRes] = await Promise.all([
        sb
          .from('bronze.dld_transactions')
          .select('instance_date, rooms_en, actual_worth, meter_sale_price, reg_type_en, area_name_en')
          .eq('trans_group_en', 'Sales')
          .order('instance_date', { ascending: false })
          .limit(10000),
        sb
          .from('gold.rental_yield')
          .select('area_name, gross_yield')
          .order('gross_yield', { ascending: false })
          .limit(20),
        sb
          .from('bronze.eibor_rates')
          .select('*')
          .order('date', { ascending: false })
          .limit(12),
        sb
          .from('gold.phase_mismatch')
          .select('phase_name, master_project_en, mismatch_label, ready_sale_psm, current_psm')
          .in('mismatch_label', ['OVERPRICED_OFFPLAN', 'DEEP_DISCOUNT_OFFPLAN', 'READY_PREMIUM'])
          .order('current_psm', { ascending: false })
          .limit(20),
      ]);

      const txns = (txnRes.data ?? []) as Record<string, unknown>[];
      const now = new Date();
      const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const curYear = now.getFullYear();

      // KPIs
      let mtdCount = 0, mtdVal = 0, ytdCount = 0, ytdVal = 0, offplanCount = 0, totalCount = 0;
      const recentPsf: number[] = [];
      const oldPsf: number[] = [];

      txns.forEach((r) => {
        const d = new Date(r.instance_date as string);
        const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const worth = (r.actual_worth as number) ?? 0;
        const msp = (r.meter_sale_price as number) ?? 0;
        const regType = (r.reg_type_en as string) ?? '';

        totalCount++;
        if (regType.toLowerCase().includes('off-plan')) offplanCount++;
        if (m === curMonth) { mtdCount++; mtdVal += worth; }
        if (d.getFullYear() === curYear) { ytdCount++; ytdVal += worth; }
        if (msp > 0) {
          const monthsAgo = (now.getFullYear() - d.getFullYear()) * 12 + now.getMonth() - d.getMonth();
          if (monthsAgo <= 3) recentPsf.push(msp);
          if (monthsAgo >= 12 && monthsAgo <= 15) oldPsf.push(msp);
        }
      });

      const avgRecent = recentPsf.length ? recentPsf.reduce((a, b) => a + b, 0) / recentPsf.length : 0;
      const avgOld = oldPsf.length ? oldPsf.reduce((a, b) => a + b, 0) / oldPsf.length : 0;
      const yoyPct = avgOld > 0 ? ((avgRecent - avgOld) / avgOld * 100).toFixed(1) : '—';
      const offplanPct = totalCount > 0 ? (offplanCount / totalCount * 100).toFixed(1) : '0';

      setKpis([
        { label: 'MTD Transactions', value: mtdCount.toLocaleString(), sub: `AED ${(mtdVal / 1e9).toFixed(1)}bn` },
        { label: 'Off-Plan %', value: `${offplanPct}%`, sub: `${offplanCount.toLocaleString()} of ${totalCount.toLocaleString()}` },
        { label: 'YTD Volume', value: ytdCount.toLocaleString(), sub: `AED ${(ytdVal / 1e9).toFixed(1)}bn` },
        { label: 'YoY PSF Change', value: typeof yoyPct === 'string' && yoyPct !== '—' ? `${Number(yoyPct) > 0 ? '+' : ''}${yoyPct}%` : '—' },
      ]);

      // Monthly Volume — 14 months
      const byMonth: Record<string, { count: number; val: number }> = {};
      txns.forEach((r) => {
        const d = new Date(r.instance_date as string);
        const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!byMonth[m]) byMonth[m] = { count: 0, val: 0 };
        byMonth[m].count++;
        byMonth[m].val += (r.actual_worth as number) ?? 0;
      });
      setMonthlyVolume(
        Object.entries(byMonth)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-14)
          .map(([month, v]) => ({ month, count: v.count, valueBn: Number((v.val / 1e9).toFixed(2)) }))
      );

      // Bedroom PSF Trend (14m)
      const brByMonth: Record<string, Record<string, { sum: number; cnt: number }>> = {};
      txns.forEach((r) => {
        const room = r.rooms_en as string;
        if (!['Studio', '1 B/R', '2 B/R', '3 B/R'].includes(room)) return;
        const msp = (r.meter_sale_price as number) ?? 0;
        if (msp <= 0) return;
        const d = new Date(r.instance_date as string);
        const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!brByMonth[m]) brByMonth[m] = {};
        if (!brByMonth[m][room]) brByMonth[m][room] = { sum: 0, cnt: 0 };
        brByMonth[m][room].sum += msp / SQM_TO_SQFT;
        brByMonth[m][room].cnt++;
      });
      setBedroomTrend(
        Object.entries(brByMonth)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-14)
          .map(([month, rooms]) => {
            const pt: BedroomTrend = { month };
            for (const [room, v] of Object.entries(rooms)) {
              (pt as unknown as Record<string, unknown>)[room] = Math.round(v.sum / v.cnt);
            }
            return pt;
          })
      );

      // Top 12 Areas by PSF
      const byArea: Record<string, { sum: number; cnt: number }> = {};
      txns.forEach((r) => {
        const area = (r.area_name_en as string) ?? '';
        const msp = (r.meter_sale_price as number) ?? 0;
        if (!area || msp <= 0) return;
        if (!byArea[area]) byArea[area] = { sum: 0, cnt: 0 };
        byArea[area].sum += msp / SQM_TO_SQFT;
        byArea[area].cnt++;
      });
      setTop12Areas(
        Object.entries(byArea)
          .filter(([, v]) => v.cnt >= 5)
          .sort(([, a], [, b]) => b.cnt - a.cnt)
          .slice(0, 12)
          .map(([area, v]) => ({ area, psf: Math.round(v.sum / v.cnt), count: v.cnt }))
      );

      // Rental Yields
      if (yieldRes.data) {
        setRentalYields(
          (yieldRes.data as Record<string, unknown>[]).map((r) => ({
            area: (r.area_name as string) ?? '',
            grossYield: Number(r.gross_yield) ?? 0,
          }))
        );
      }

      // EIBOR
      if (eiborRes.data) setEibor(eiborRes.data as { date: string; [k: string]: unknown }[]);

      // Phase Mismatch
      if (phaseRes.data) {
        setPhaseMismatch(
          (phaseRes.data as Record<string, unknown>[]).map((r) => {
            const readyPsm = (r.ready_sale_psm as number) ?? 0;
            const curPsm = (r.current_psm as number) ?? 0;
            return {
              phaseName: (r.phase_name as string) ?? '',
              masterProject: (r.master_project_en as string) ?? '',
              mismatchLabel: (r.mismatch_label as string) ?? '',
              readyPsf: Math.round(readyPsm / SQM_TO_SQFT),
              offplanPsf: Math.round(curPsm / SQM_TO_SQFT),
              premiumPct: readyPsm > 0 ? Number(((curPsm - readyPsm) * 100 / readyPsm).toFixed(1)) : 0,
            };
          })
        );
      }

      setLoading(false);
    };
    run();
  }, []);

  return { kpis, monthlyVolume, bedroomTrend, top12Areas, rentalYields, eibor, phaseMismatch, loading };
}
