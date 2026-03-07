import { useEffect, useState, useCallback } from 'react';
import { sb, gold, silver, bronze } from '@/lib/supabase';
import { SQM_TO_SQFT } from '@/lib/constants';

/* ── Transaction Cards ────────────────────────────────────── */
export interface DealCard {
  id: string;
  type: 'offplan' | 'ready' | 'rent_new' | 'rent_renew';
  title: string;
  price: number;
  psfSqft: number | null;
  subLabel: string;
  time: string;
  rooms: string;
  area: string;
  regType: string;
}

/* ── News / Feed ──────────────────────────────────────────── */
export interface FeedItem {
  id: string;
  source: 'government' | 'safe_haven' | 'policy';
  title: string;
  description: string;
  impactScore: number;
  date: string;
  communities: string[];
  direction?: string;
  type?: string;
}

/* ── Market KPIs ──────────────────────────────────────────── */
export interface MonthlyPoint {
  month: string;
  offplan: number;
  ready: number;
  total: number;
  valueBn: number;
}

export interface AreaHeat {
  area: string;
  count: number;
  avgPsf: number;
  totalValue: number;
  yoyPsfPct: number;
}

export interface YoYComparison {
  area: string;
  curYearCount: number;
  prevYearCount: number;
  curYearPsf: number;
  prevYearPsf: number;
  psfChangePct: number;
  volumeChangePct: number;
}

/* ── Capital Rotation ─────────────────────────────────────── */
export interface CapitalFlow {
  quarter: string;
  area: string;
  txnCount: number;
  totalValueAed: number;
  avgPrice: number;
  qoqPricePct: number;
  yoyPricePct: number;
  rotationSignal: string;
}

/* ── Rental Analysis ──────────────────────────────────────── */
export interface RentalTrend {
  area: string;
  periodStart: string;
  avgRent: number;
  totalContracts: number;
  renewalPct: number;
}

/* ── Supply Pipeline ──────────────────────────────────────── */
export interface SupplyItem {
  phaseName: string;
  masterProject: string;
  developer: string;
  launchDate: string;
  completionPct: number;
  isOffplan: boolean;
  currentPsf: number;
}

/* ── EIBOR ────────────────────────────────────────────────── */
export interface EiborRate {
  date: string;
  rate_1m?: number;
  rate_3m?: number;
  rate_6m?: number;
}

/* ── Hook Return ──────────────────────────────────────────── */
export interface HomeData {
  // Transactions
  offplanDeals: DealCard[];
  readyDeals: DealCard[];
  rentalDeals: DealCard[];
  dealsLoading: boolean;
  loadMoreDeals: () => void;

  // News
  feed: FeedItem[];
  feedLoading: boolean;

  // Sales dashboard
  monthlyVolume: MonthlyPoint[];
  areaHeat: AreaHeat[];
  yoy: YoYComparison[];
  offplanSplit: { label: string; count: number; valueBn: number }[];

  // Capital rotation
  capitalFlow: CapitalFlow[];

  // Rentals
  rentalTrends: RentalTrend[];

  // Supply
  supplyPipeline: SupplyItem[];

  // EIBOR
  eibor: EiborRate[];

  // Loading
  dashLoading: boolean;
}

export function useHomeData(): HomeData {
  /* Transactions */
  const [offplanDeals, setOffplanDeals] = useState<DealCard[]>([]);
  const [readyDeals, setReadyDeals] = useState<DealCard[]>([]);
  const [rentalDeals, setRentalDeals] = useState<DealCard[]>([]);
  const [dealsLoading, setDealsLoading] = useState(true);
  const [dealPage, setDealPage] = useState(0);

  /* News */
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);

  /* Dashboard */
  const [monthlyVolume, setMonthlyVolume] = useState<MonthlyPoint[]>([]);
  const [areaHeat, setAreaHeat] = useState<AreaHeat[]>([]);
  const [yoy, setYoy] = useState<YoYComparison[]>([]);
  const [offplanSplit, setOffplanSplit] = useState<{ label: string; count: number; valueBn: number }[]>([]);
  const [capitalFlow, setCapitalFlow] = useState<CapitalFlow[]>([]);
  const [rentalTrends, setRentalTrends] = useState<RentalTrend[]>([]);
  const [supplyPipeline, setSupplyPipeline] = useState<SupplyItem[]>([]);
  const [eibor, setEibor] = useState<EiborRate[]>([]);
  const [dashLoading, setDashLoading] = useState(true);

  /* ── Fetch Transactions ─────────────────────────────────── */
  const fetchDeals = useCallback(async (page: number) => {
    setDealsLoading(true);
    const offset = page * 30;
    const [salesRes, rentRes] = await Promise.all([
      bronze().from('dld_transactions')
        .select('instance_date, rooms_en, actual_worth, meter_sale_price, procedure_area, project_name_en, master_project_en, area_name_en, reg_type_en')
        .eq('trans_group_en', 'Sales')
        .order('instance_date', { ascending: false })
        .range(offset, offset + 59),
      bronze().from('rent_contracts_clean')
        .select('contract_start_date, ejari_property_sub_type_en, annual_amount, contract_reg_type_en, project_name_en, area_name_en')
        .order('contract_start_date', { ascending: false })
        .range(offset, offset + 29),
    ]);

    const sales: DealCard[] = (salesRes.data ?? []).map((r: Record<string, unknown>, i: number) => {
      const msp = (r.meter_sale_price as number) ?? 0;
      const area = (r.procedure_area as number) ?? 0;
      const regType = (r.reg_type_en as string) ?? '';
      const isOffplan = regType.toLowerCase().includes('off-plan');
      return {
        id: `s-${page}-${i}`,
        type: isOffplan ? 'offplan' as const : 'ready' as const,
        title: `${(r.master_project_en as string) ?? (r.project_name_en as string) ?? ''} · ${(r.rooms_en as string) ?? ''}`.slice(0, 40),
        price: (r.actual_worth as number) ?? 0,
        psfSqft: msp > 0 ? Math.round(msp / SQM_TO_SQFT) : null,
        subLabel: `${(r.area_name_en as string) ?? ''} · ${Math.round(area * SQM_TO_SQFT)} sqft`,
        time: (r.instance_date as string) ?? '',
        rooms: (r.rooms_en as string) ?? '',
        area: (r.area_name_en as string) ?? '',
        regType,
      };
    });

    const rents: DealCard[] = (rentRes.data ?? []).map((r: Record<string, unknown>, i: number) => {
      const ct = ((r.contract_reg_type_en as string) ?? '').toLowerCase();
      return {
        id: `r-${page}-${i}`,
        type: ct.includes('renew') ? 'rent_renew' as const : 'rent_new' as const,
        title: `${(r.project_name_en as string) ?? ''} · ${(r.ejari_property_sub_type_en as string) ?? ''}`.slice(0, 40),
        price: (r.annual_amount as number) ?? 0,
        psfSqft: null,
        subLabel: (r.area_name_en as string) ?? '',
        time: (r.contract_start_date as string) ?? '',
        rooms: (r.ejari_property_sub_type_en as string) ?? '',
        area: (r.area_name_en as string) ?? '',
        regType: (r.contract_reg_type_en as string) ?? '',
      };
    });

    if (page === 0) {
      setOffplanDeals(sales.filter((d) => d.type === 'offplan'));
      setReadyDeals(sales.filter((d) => d.type === 'ready'));
      setRentalDeals(rents);
    } else {
      setOffplanDeals((p) => [...p, ...sales.filter((d) => d.type === 'offplan')]);
      setReadyDeals((p) => [...p, ...sales.filter((d) => d.type === 'ready')]);
      setRentalDeals((p) => [...p, ...rents]);
    }
    setDealsLoading(false);
  }, []);

  const loadMoreDeals = useCallback(() => {
    const next = dealPage + 1;
    setDealPage(next);
    fetchDeals(next);
  }, [dealPage, fetchDeals]);

  /* ── Fetch News Feed ────────────────────────────────────── */
  useEffect(() => {
    const run = async () => {
      const [govRes, shRes, polRes] = await Promise.all([
        sb.from('bronze_government_catalysts')
          .select('catalyst_name, catalyst_type, current_status, announced_date, base_impact_score, description, affected_communities')
          .order('announced_date', { ascending: false }).limit(20),
        bronze().from('safe_haven_catalysts')
          .select('event_name, event_type, origin_country, severity, capital_flow_direction, description, event_date')
          .order('event_date', { ascending: false }).limit(10),
        bronze().from('policy_events')
          .select('event_name, policy_type, direction, description, estimated_impact_pct, affected_communities, event_date')
          .order('event_date', { ascending: false }).limit(10),
      ]);

      const items: FeedItem[] = [];
      (govRes.data ?? []).forEach((r: Record<string, unknown>, i: number) => {
        items.push({ id: `g-${i}`, source: 'government', title: (r.catalyst_name as string) ?? '', description: (r.description as string) ?? '',
          impactScore: (r.base_impact_score as number) ?? 0, date: (r.announced_date as string) ?? '',
          communities: Array.isArray(r.affected_communities) ? r.affected_communities as string[] : [], type: (r.catalyst_type as string) ?? '' });
      });
      (shRes.data ?? []).forEach((r: Record<string, unknown>, i: number) => {
        items.push({ id: `sh-${i}`, source: 'safe_haven', title: (r.event_name as string) ?? '', description: (r.description as string) ?? '',
          impactScore: (r.severity as number) ?? 0, date: (r.event_date as string) ?? '', communities: [],
          direction: (r.capital_flow_direction as string) ?? '', type: (r.event_type as string) ?? '' });
      });
      (polRes.data ?? []).forEach((r: Record<string, unknown>, i: number) => {
        items.push({ id: `p-${i}`, source: 'policy', title: (r.event_name as string) ?? '', description: (r.description as string) ?? '',
          impactScore: (r.estimated_impact_pct as number) ?? 0, date: (r.event_date as string) ?? '',
          communities: Array.isArray(r.affected_communities) ? r.affected_communities as string[] : [],
          direction: (r.direction as string) ?? '', type: (r.policy_type as string) ?? '' });
      });
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setFeed(items);
      setFeedLoading(false);
    };
    run();
  }, []);

  /* ── Fetch Dashboard Data ───────────────────────────────── */
  useEffect(() => {
    const run = async () => {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - 24);
      const cutoffStr = cutoff.toISOString().slice(0, 10);

      const [txnRes, eiborRes, capRes, rentTsRes, supplyRes] = await Promise.all([
        bronze().from('dld_transactions')
          .select('instance_date, meter_sale_price, actual_worth, reg_type_en, area_name_en')
          .eq('trans_group_en', 'Sales')
          .gte('instance_date', cutoffStr)
          .order('instance_date', { ascending: false })
          .limit(80000),
        bronze().from('eibor_rates')
          .select('*').order('date', { ascending: false }).limit(12),
        gold().from('capital_rotation_quarterly')
          .select('quarter, area_name_en, txn_count, total_value_aed, avg_price, qoq_price_pct, yoy_price_pct, rotation_signal')
          .gte('txn_count', 10)
          .order('total_value_aed', { ascending: false }).limit(500),
        silver().from('rent_timeseries')
          .select('area_name, period_start, avg_annual_rent, total_contracts, renewal_pct')
          .eq('period_type', 'quarterly')
          .order('period_start', { ascending: false }).limit(200),
        gold().from('phase_registry')
          .select('phase_name, master_project_en, developer_name, launch_date, completion_pct, current_psm')
          .lt('completion_pct', 100)
          .order('launch_date', { ascending: false }).limit(50),
      ]);

      const txns = (txnRes.data ?? []) as Record<string, unknown>[];
      const now = new Date();
      const curYear = now.getFullYear();
      const prevYear = curYear - 1;

      // ── Monthly Volume (offplan vs ready)
      const byMonth: Record<string, { offplan: number; ready: number; total: number; val: number }> = {};
      txns.forEach((r) => {
        const d = new Date(r.instance_date as string);
        const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!byMonth[m]) byMonth[m] = { offplan: 0, ready: 0, total: 0, val: 0 };
        const isOp = ((r.reg_type_en as string) ?? '').toLowerCase().includes('off-plan');
        if (isOp) byMonth[m].offplan++; else byMonth[m].ready++;
        byMonth[m].total++;
        byMonth[m].val += (r.actual_worth as number) ?? 0;
      });
      setMonthlyVolume(
        Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).slice(-14)
          .map(([month, v]) => ({ month, offplan: v.offplan, ready: v.ready, total: v.total, valueBn: Number((v.val / 1e9).toFixed(2)) }))
      );

      // ── Offplan vs Ready split
      let opCount = 0, opVal = 0, rdCount = 0, rdVal = 0;
      txns.forEach((r) => {
        const isOp = ((r.reg_type_en as string) ?? '').toLowerCase().includes('off-plan');
        const w = (r.actual_worth as number) ?? 0;
        if (isOp) { opCount++; opVal += w; } else { rdCount++; rdVal += w; }
      });
      setOffplanSplit([
        { label: 'Off-Plan', count: opCount, valueBn: Number((opVal / 1e9).toFixed(2)) },
        { label: 'Ready / Secondary', count: rdCount, valueBn: Number((rdVal / 1e9).toFixed(2)) },
      ]);

      // ── Area heatmap + YoY
      const byAreaYear: Record<string, Record<number, { count: number; psfSum: number; psfCnt: number; valSum: number }>> = {};
      txns.forEach((r) => {
        const area = (r.area_name_en as string) ?? '';
        const msp = (r.meter_sale_price as number) ?? 0;
        const yr = new Date(r.instance_date as string).getFullYear();
        if (!area) return;
        if (!byAreaYear[area]) byAreaYear[area] = {};
        if (!byAreaYear[area][yr]) byAreaYear[area][yr] = { count: 0, psfSum: 0, psfCnt: 0, valSum: 0 };
        byAreaYear[area][yr].count++;
        byAreaYear[area][yr].valSum += (r.actual_worth as number) ?? 0;
        if (msp > 0) { byAreaYear[area][yr].psfSum += msp / SQM_TO_SQFT; byAreaYear[area][yr].psfCnt++; }
      });

      const heatArr: AreaHeat[] = [];
      const yoyArr: YoYComparison[] = [];
      for (const [area, years] of Object.entries(byAreaYear)) {
        const cur = years[curYear]; const prev = years[prevYear];
        const totalCount = Object.values(years).reduce((s, y) => s + y.count, 0);
        const totalPsfSum = Object.values(years).reduce((s, y) => s + y.psfSum, 0);
        const totalPsfCnt = Object.values(years).reduce((s, y) => s + y.psfCnt, 0);
        const totalVal = Object.values(years).reduce((s, y) => s + y.valSum, 0);
        const avgPsf = totalPsfCnt > 0 ? Math.round(totalPsfSum / totalPsfCnt) : 0;
        const curPsf = cur?.psfCnt ? Math.round(cur.psfSum / cur.psfCnt) : 0;
        const prevPsf = prev?.psfCnt ? Math.round(prev.psfSum / prev.psfCnt) : 0;
        const yoyPsfPct = prevPsf > 0 ? Number(((curPsf - prevPsf) / prevPsf * 100).toFixed(1)) : 0;
        heatArr.push({ area, count: totalCount, avgPsf, totalValue: totalVal, yoyPsfPct });
        if (cur && prev) {
          yoyArr.push({
            area, curYearCount: cur.count, prevYearCount: prev.count,
            curYearPsf: curPsf, prevYearPsf: prevPsf,
            psfChangePct: yoyPsfPct,
            volumeChangePct: Number(((cur.count - prev.count) / prev.count * 100).toFixed(1)),
          });
        }
      }
      setAreaHeat(heatArr.sort((a, b) => b.count - a.count).slice(0, 20));
      setYoy(yoyArr.sort((a, b) => Math.abs(b.psfChangePct) - Math.abs(a.psfChangePct)).slice(0, 15));

      // ── EIBOR
      if (eiborRes.data) setEibor(eiborRes.data as EiborRate[]);

      // ── Capital Rotation
      if (capRes.data) {
        setCapitalFlow(
          (capRes.data as Record<string, unknown>[]).map((r) => ({
            quarter: (r.quarter as string) ?? '',
            area: (r.area_name_en as string) ?? '',
            txnCount: (r.txn_count as number) ?? 0,
            totalValueAed: (r.total_value_aed as number) ?? 0,
            avgPrice: (r.avg_price as number) ?? 0,
            qoqPricePct: (r.qoq_price_pct as number) ?? 0,
            yoyPricePct: (r.yoy_price_pct as number) ?? 0,
            rotationSignal: (r.rotation_signal as string) ?? '',
          }))
        );
      }

      // ── Rental trends (where renewals declining/increasing)
      if (rentTsRes.data) {
        setRentalTrends(
          (rentTsRes.data as Record<string, unknown>[]).map((r) => ({
            area: (r.area_name as string) ?? '',
            periodStart: (r.period_start as string) ?? '',
            avgRent: (r.avg_annual_rent as number) ?? 0,
            totalContracts: (r.total_contracts as number) ?? 0,
            renewalPct: (r.renewal_pct as number) ?? 0,
          }))
        );
      }

      // ── Supply pipeline (off-plan phases not yet complete)
      if (supplyRes.data) {
        setSupplyPipeline(
          (supplyRes.data as Record<string, unknown>[]).map((r) => ({
            phaseName: (r.phase_name as string) ?? '',
            masterProject: (r.master_project_en as string) ?? '',
            developer: (r.developer_name as string) ?? '',
            launchDate: (r.launch_date as string) ?? '',
            completionPct: (r.completion_pct as number) ?? 0,
            isOffplan: true,
            currentPsf: Math.round(((r.current_psm as number) ?? 0) / SQM_TO_SQFT),
          }))
        );
      }

      setDashLoading(false);
    };
    run();
  }, []);

  /* Initial deal fetch */
  useEffect(() => { fetchDeals(0); }, [fetchDeals]);

  return {
    offplanDeals, readyDeals, rentalDeals, dealsLoading, loadMoreDeals,
    feed, feedLoading,
    monthlyVolume, areaHeat, yoy, offplanSplit,
    capitalFlow, rentalTrends, supplyPipeline, eibor,
    dashLoading,
  };
}
