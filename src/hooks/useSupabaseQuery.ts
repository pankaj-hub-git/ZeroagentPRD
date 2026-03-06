import { useEffect, useState } from 'react';
import { sb } from '@/lib/supabase';

interface QueryResult<T> {
  data: T[] | null;
  count: number | null;
  loading: boolean;
  error: string | null;
}

/**
 * Generic hook for Supabase SELECT queries.
 * Re-fetches when `key` changes (or on mount).
 */
export function useSupabaseQuery<T = Record<string, unknown>>(
  table: string,
  options: {
    select?: string;
    filters?: Array<{ col: string; op: string; val: unknown }>;
    order?: { col: string; ascending?: boolean };
    limit?: number;
    ilike?: { col: string; pattern: string };
    enabled?: boolean;
  } = {},
  key?: string
): QueryResult<T> {
  const [data, setData] = useState<T[] | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const enabled = options.enabled ?? true;

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const run = async () => {
      let query = sb
        .from(table)
        .select(options.select ?? '*', { count: 'exact' });

      if (options.filters) {
        for (const f of options.filters) {
          query = query.filter(f.col, f.op, f.val);
        }
      }

      if (options.ilike) {
        query = query.ilike(options.ilike.col, options.ilike.pattern);
      }

      if (options.order) {
        query = query.order(options.order.col, {
          ascending: options.order.ascending ?? false,
        });
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data: rows, error: err, count: c } = await query;

      if (cancelled) return;

      if (err) {
        setError(err.message);
        setData(null);
      } else {
        setData(rows as T[]);
        setCount(c);
        setError(null);
      }
      setLoading(false);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [table, key, enabled]);

  return { data, count, loading, error };
}
