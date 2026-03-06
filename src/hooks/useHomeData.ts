import { useEffect, useState, useCallback } from 'react';
import { sb } from '@/lib/supabase';
import { SQM_TO_SQFT } from '@/lib/constants';

/* ── Deal Card ─────────────────────────────────────────────── */
export interface DealCard {
  id: string;
  type: 'sale' | 'rent_new' | 'rent_renew';
  offPlan: boolean;
  title: string;    // [master_project] · [rooms]
  price: number;    // AED
  psfSqft: number | null; // only sales
  subLabel: string; // area · sqft
  time: string;     // instance_date ISO
  rooms: string;
  regType: string;
}

/* ── Market Pulse ──────────────────────────────────────────── */
export interface MtdVolume {
  count: number;
  totalValue: number;
}

export interface PsfTrendPoint {
  month: string;
  psf: number;
  count: number;
}

export interface BedroomPsf {
  rooms: string;
  psf: number;
}

export interface OffplanSplit {
  regType: string;
  count: number;
  valueBn: number;
}

export interface TopArea {
  area: string;
  psf: number;
  count: number;
}

export interface EiborRate {
  date: string;
  rate_1m?: number;
  rate_3m?: number;
  rate_6m?: number;
}

/* ── Gov Feed ──────────────────────────────────────────────── */
export interface GovFeedItem {
  id: string;
  source: 'government' | 'safe_haven' | 'policy';
  title: string;
  description: string;
  impactScore: number;
  date: string;
  communities: string[];
  meta: Record<string, unknown>;
}

/* ── Hook Return ───────────────────────────────────────────── */
interface HomeData {
  deals: DealCard[];
  dealsLoading: boolean;
  loadMoreDeals: () => void;
  mtd: MtdVolume | null;
  psfTrend: PsfTrendPoint[];
  bedroomPsf: BedroomPsf[];
  offplanSplit: OffplanSplit[];
  topAreas: TopArea[];
  eibor: EiborRate[];
  pulseLoading: boolean;
  govFeed: GovFeedItem[];
  govLoading: boolean;
}

export function useHomeData(): HomeData {
  /* Deals */
  const [deals, setDeals] = useState<DealCard[]>([]);
  const [dealsLoading, setDealsLoading] = useState(true);
  const [dealPage, setDealPage] = useState(0);

  /* Market Pulse */
  const [mtd, setMtd] = useState<MtdVolume | null>(null);
  const [psfTrend, setPsfTrend] = useState<PsfTrendPoint[]>([]);
  const [bedroomPsf, setBedroomPsf] = useState<BedroomPsf[]>([]);
  const [offplanSplit, setOffplanSplit] = useState<OffplanSplit[]>([]);
  const [topAreas, setTopAreas] = useState<TopArea[]>([]);
  const [eibor, setEibor] = useState<EiborRate[]>([]);
  const [pulseLoading, setPulseLoading] = useState(true);

  /* Gov Feed */
  const [govFeed, setGovFeed] = useState<GovFeedItem[]>([]);
  const [govLoading, setGovLoading] = useState(true);

  /* ── Load Deals ─────────────────────────────────────────── */
  const fetchDeals = useCallback(async (page: number) => {
    setDealsLoading(true);
    const offset = page * 40;
    const [salesRes, rentRes] = await Promise.all([
      sb
        .from('bronze.dld_transactions')
        .select('instance_date, rooms_en, actual_worth, meter_sale_price, procedure_area, project_name_en, master_project_en, building_name_en, area_name_en, reg_type_en, transaction_id')
        .eq('trans_group_en', 'Sales')
        .order('instance_date', { ascending: false })
        .range(offset, offset + 39),
      sb
        .from('bronze.rent_contracts_clean')
        .select('contract_start_date, ejari_property_sub_type_en, annual_amount, contract_reg_type_en, project_name_en, area_name_en, ejari_bus_property_type_en, contract_id')
        .order('contract_start_date', { ascending: false })
        .range(offset, offset + 39),
    ]);

    const saleDealCards: DealCard[] = (salesRes.data ?? []).map((r: Record<string, unknown>, i: number) => {
      const msp = (r.meter_sale_price as number) ?? 0;
      const area = (r.procedure_area as number) ?? 0;
      const regType = (r.reg_type_en as string) ?? '';
      return {
        id: `sale-${page}-${i}`,
        type: 'sale' as const,
        offPlan: regType.toLowerCase().includes('off-plan'),
        title: `${(r.master_project_en as string) ?? (r.project_name_en as string) ?? 'Unknown'} · ${(r.rooms_en as string) ?? ''}`.slice(0, 32),
        price: (r.actual_worth as number) ?? 0,
        psfSqft: msp > 0 ? Math.round(msp / SQM_TO_SQFT) : null,
        subLabel: `${(r.area_name_en as string) ?? ''} · ${Math.round(area * SQM_TO_SQFT)} sqft`,
        time: (r.instance_date as string) ?? '',
        rooms: (r.rooms_en as string) ?? '',
        regType,
      };
    });

    const rentDealCards: DealCard[] = (rentRes.data ?? []).map((r: Record<string, unknown>, i: number) => {
      const contractType = ((r.contract_reg_type_en as string) ?? '').toLowerCase();
      return {
        id: `rent-${page}-${i}`,
        type: contractType.includes('renew') ? 'rent_renew' as const : 'rent_new' as const,
        offPlan: false,
        title: `${(r.project_name_en as string) ?? 'Unknown'} · ${(r.ejari_property_sub_type_en as string) ?? ''}`.slice(0, 32),
        price: (r.annual_amount as number) ?? 0,
        psfSqft: null,
        subLabel: `${(r.area_name_en as string) ?? ''}`,
        time: (r.contract_start_date as string) ?? '',
        rooms: (r.ejari_property_sub_type_en as string) ?? '',
        regType: (r.contract_reg_type_en as string) ?? '',
      };
    });

    const merged = [...saleDealCards, ...rentDealCards].sort(
      (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
    );

    setDeals((prev) => (page === 0 ? merged : [...prev, ...merged]));
    setDealsLoading(false);
  }, []);

  const loadMoreDeals = useCallback(() => {
    const next = dealPage + 1;
    setDealPage(next);
    fetchDeals(next);
  }, [dealPage, fetchDeals]);

  /* ── Load Market Pulse ──────────────────────────────────── */
  useEffect(() => {
    const run = async () => {
      const [mtdRes, trendRes, brRes, opRes, areaRes, eiborRes] = await Promise.all([
        sb.rpc('sql', {
          query: `SELECT COUNT(*) as txns, SUM(actual_worth) as total_value FROM bronze.dld_transactions WHERE trans_group_en='Sales' AND DATE_TRUNC('month',instance_date)=DATE_TRUNC('month',NOW())`,
        }).maybeSingle(),
        sb
          .from('bronze.dld_transactions')
          .select('instance_date, meter_sale_price')
          .eq('trans_group_en', 'Sales')
          .gt('meter_sale_price', 0)
          .order('instance_date', { ascending: false })
          .limit(5000),
        sb
          .from('bronze.dld_transactions')
          .select('rooms_en, meter_sale_price')
          .eq('trans_group_en', 'Sales')
          .gt('meter_sale_price', 0)
          .in('rooms_en', ['Studio', '1 B/R', '2 B/R', '3 B/R'])
          .order('instance_date', { ascending: false })
          .limit(3000),
        sb
          .from('bronze.dld_transactions')
          .select('reg_type_en, actual_worth')
          .eq('trans_group_en', 'Sales')
          .order('instance_date', { ascending: false })
          .limit(2000),
        sb
          .from('bronze.dld_transactions')
          .select('area_name_en, meter_sale_price')
          .eq('trans_group_en', 'Sales')
          .gt('meter_sale_price', 0)
          .order('instance_date', { ascending: false })
          .limit(5000),
        sb
          .from('bronze.eibor_rates')
          .select('*')
          .order('date', { ascending: false })
          .limit(2),
      ]);

      // MTD — fallback to client-side count if RPC not available
      if (mtdRes.data) {
        const d = mtdRes.data as Record<string, unknown>;
        setMtd({ count: Number(d.txns) || 0, totalValue: Number(d.total_value) || 0 });
      }

      // PSF Trend — aggregate client-side by month
      if (trendRes.data) {
        const byMonth: Record<string, { sum: number; count: number }> = {};
        (trendRes.data as Record<string, unknown>[]).forEach((r) => {
          const d = new Date(r.instance_date as string);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (!byMonth[key]) byMonth[key] = { sum: 0, count: 0 };
          byMonth[key].sum += (r.meter_sale_price as number) / SQM_TO_SQFT;
          byMonth[key].count++;
        });
        const sorted = Object.entries(byMonth)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-14)
          .map(([month, v]) => ({
            month,
            psf: Math.round(v.sum / v.count),
            count: v.count,
          }));
        setPsfTrend(sorted);
      }

      // Bedroom PSF — aggregate client-side
      if (brRes.data) {
        const byRoom: Record<string, { sum: number; count: number }> = {};
        (brRes.data as Record<string, unknown>[]).forEach((r) => {
          const room = r.rooms_en as string;
          if (!byRoom[room]) byRoom[room] = { sum: 0, count: 0 };
          byRoom[room].sum += (r.meter_sale_price as number) / SQM_TO_SQFT;
          byRoom[room].count++;
        });
        setBedroomPsf(
          Object.entries(byRoom).map(([rooms, v]) => ({
            rooms,
            psf: Math.round(v.sum / v.count),
          }))
        );
      }

      // Offplan Split — aggregate client-side
      if (opRes.data) {
        const byType: Record<string, { count: number; sum: number }> = {};
        (opRes.data as Record<string, unknown>[]).forEach((r) => {
          const rt = (r.reg_type_en as string) ?? 'Unknown';
          if (!byType[rt]) byType[rt] = { count: 0, sum: 0 };
          byType[rt].count++;
          byType[rt].sum += (r.actual_worth as number) ?? 0;
        });
        setOffplanSplit(
          Object.entries(byType).map(([regType, v]) => ({
            regType,
            count: v.count,
            valueBn: Number((v.sum / 1e9).toFixed(2)),
          }))
        );
      }

      // Top Areas — aggregate client-side
      if (areaRes.data) {
        const byArea: Record<string, { sum: number; count: number }> = {};
        (areaRes.data as Record<string, unknown>[]).forEach((r) => {
          const area = (r.area_name_en as string) ?? '';
          if (!area) return;
          if (!byArea[area]) byArea[area] = { sum: 0, count: 0 };
          byArea[area].sum += (r.meter_sale_price as number) / SQM_TO_SQFT;
          byArea[area].count++;
        });
        const sorted = Object.entries(byArea)
          .sort(([, a], [, b]) => b.count - a.count)
          .slice(0, 5)
          .map(([area, v]) => ({
            area,
            psf: Math.round(v.sum / v.count),
            count: v.count,
          }));
        setTopAreas(sorted);
      }

      // EIBOR
      if (eiborRes.data) {
        setEibor(eiborRes.data as EiborRate[]);
      }

      setPulseLoading(false);
    };
    run();
  }, []);

  /* ── Load Gov Feed ──────────────────────────────────────── */
  useEffect(() => {
    const run = async () => {
      const [govRes, shRes, polRes] = await Promise.all([
        sb
          .from('bronze_government_catalysts')
          .select('catalyst_name, catalyst_type, current_status, announced_date, base_impact_score, description, affected_communities')
          .order('announced_date', { ascending: false })
          .limit(20),
        sb
          .from('bronze.safe_haven_catalysts')
          .select('event_name, event_type, origin_country, severity, capital_flow_direction, description, event_date')
          .order('event_date', { ascending: false })
          .limit(10),
        sb
          .from('bronze.policy_events')
          .select('event_name, policy_type, direction, description, estimated_impact_pct, affected_communities, event_date')
          .order('event_date', { ascending: false })
          .limit(10),
      ]);

      const items: GovFeedItem[] = [];

      (govRes.data ?? []).forEach((r: Record<string, unknown>, i: number) => {
        items.push({
          id: `gov-${i}`,
          source: 'government',
          title: (r.catalyst_name as string) ?? 'Government Catalyst',
          description: (r.description as string) ?? '',
          impactScore: (r.base_impact_score as number) ?? 0,
          date: (r.announced_date as string) ?? '',
          communities: Array.isArray(r.affected_communities) ? (r.affected_communities as string[]) : [],
          meta: { type: r.catalyst_type, status: r.current_status },
        });
      });

      (shRes.data ?? []).forEach((r: Record<string, unknown>, i: number) => {
        items.push({
          id: `sh-${i}`,
          source: 'safe_haven',
          title: (r.event_name as string) ?? 'Safe Haven Signal',
          description: (r.description as string) ?? '',
          impactScore: (r.severity as number) ?? 0,
          date: (r.event_date as string) ?? '',
          communities: [],
          meta: { type: r.event_type, origin: r.origin_country, flow: r.capital_flow_direction },
        });
      });

      (polRes.data ?? []).forEach((r: Record<string, unknown>, i: number) => {
        items.push({
          id: `pol-${i}`,
          source: 'policy',
          title: (r.event_name as string) ?? 'Policy Event',
          description: (r.description as string) ?? '',
          impactScore: 0,
          date: (r.event_date as string) ?? '',
          communities: Array.isArray(r.affected_communities) ? (r.affected_communities as string[]) : [],
          meta: { type: r.policy_type, direction: r.direction, impact: r.estimated_impact_pct },
        });
      });

      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setGovFeed(items);
      setGovLoading(false);
    };
    run();
  }, []);

  /* ── Initial deal fetch ─────────────────────────────────── */
  useEffect(() => {
    fetchDeals(0);
  }, [fetchDeals]);

  return {
    deals,
    dealsLoading,
    loadMoreDeals,
    mtd,
    psfTrend,
    bedroomPsf,
    offplanSplit,
    topAreas,
    eibor,
    pulseLoading,
    govFeed,
    govLoading,
  };
}
