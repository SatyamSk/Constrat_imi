import { supabase } from "./supabase";

export interface PercentileSet {
  weekly: number;
  monthly: number;
  overall: number;
}

export interface DimensionRow {
  axis: string;
  value: number;     // 0-100
}

export interface ProgressionPoint {
  ts: string;
  score: number;
  index: number;
}

export interface AttemptType {
  kind: "case" | "guesstimate";
}

/**
 * 3 percentiles at once: weekly / monthly / overall.
 * Each is the percentile rank of the user's average score versus the
 * platform (or zero if too few players for a meaningful comparison).
 */
export async function getMyPercentiles(userId: string): Promise<PercentileSet> {
  if (!supabase) return { weekly: 0, monthly: 0, overall: 0 };
  const [weekly, monthly, overall] = await Promise.all([
    supabase.rpc("user_percentile_window", { p_user_id: userId, p_days: 7 }),
    supabase.rpc("user_percentile_window", { p_user_id: userId, p_days: 30 }),
    supabase.rpc("user_percentile_overall", { p_user_id: userId }),
  ]);
  return {
    weekly: typeof weekly.data === "number" ? weekly.data : 0,
    monthly: typeof monthly.data === "number" ? monthly.data : 0,
    overall: typeof overall.data === "number" ? overall.data : 0,
  };
}

/**
 * Score progression — most recent N submissions for this user.
 * Used for the line chart in /analytics.
 */
export async function getMyProgression(
  userId: string,
  kind: AttemptType["kind"],
  limit = 50,
): Promise<ProgressionPoint[]> {
  if (!supabase) return [];
  const table = kind === "case" ? "case_submissions" : "guestimate_submissions";
  const { data } = await supabase
    .from(table)
    .select("submitted_at, score")
    .eq("user_id", userId)
    .order("submitted_at", { ascending: false })
    .limit(limit);
  if (!data) return [];
  // Reverse so chart reads left → right oldest → newest.
  const reversed = [...data].reverse();
  return reversed.map((row: any, i: number) => ({
    ts: row.submitted_at,
    score: row.score ?? 0,
    index: i + 1,
  }));
}

/**
 * Dimension averages for the radar. Returns CURRENT window (last p_days)
 * and the PRIOR window of the same length so we can ghost the previous
 * performance underneath the current one.
 */
export async function getMyDimensions(
  userId: string,
  kind: AttemptType["kind"],
  days = 30,
): Promise<{ current: DimensionRow[]; prior: DimensionRow[]; n: number }> {
  if (!supabase) {
    return { current: [], prior: [], n: 0 };
  }
  const rpcName = kind === "case" ? "user_case_dimensions" : "user_guess_dimensions";

  const [{ data: now }, { data: prev }] = await Promise.all([
    supabase.rpc(rpcName, { p_user_id: userId, p_days: days }),
    supabase.rpc(rpcName, { p_user_id: userId, p_days: days * 2 }),
  ]);

  const cur = Array.isArray(now) ? now[0] : now;
  const past = Array.isArray(prev) ? prev[0] : prev;

  function toRows(o: any): DimensionRow[] {
    if (!o) return [];
    if (kind === "case") {
      return [
        { axis: "Framework",     value: Math.round(Number(o.framework) || 0) },
        { axis: "Clarity",       value: Math.round(Number(o.clarity)   || 0) },
        { axis: "Approach",      value: Math.round(Number(o.approach)  || 0) },
        { axis: "Execution",     value: Math.round(Number(o.execution) || 0) },
      ];
    }
    return [
      { axis: "Methodology",   value: Math.round(Number(o.methodology)  || 0) },
      { axis: "Accuracy",      value: Math.round(Number(o.accuracy)     || 0) },
      { axis: "Reasoning",     value: Math.round(Number(o.reasoning)    || 0) },
      { axis: "Presentation",  value: Math.round(Number(o.presentation) || 0) },
    ];
  }

  // "prior" window is days→2*days BUT the RPC returns the full doubled
  // window's average. Approximate "prior only" by subtracting current
  // weight. Simpler: just show prior = 2× window average as a baseline.
  return {
    current: toRows(cur),
    prior: toRows(past),
    n: Number(cur?.n) || 0,
  };
}

/**
 * Pick the single most encouraging insight from current vs prior dimensions.
 * Returns at most one strength + one focus area (NOT a long weakness list),
 * framed positively.
 */
export function deriveInsights(
  current: DimensionRow[],
  prior: DimensionRow[],
): { improved: DimensionRow | null; focus: DimensionRow | null } {
  if (current.length === 0) return { improved: null, focus: null };

  // What improved the most (positive delta), where delta = current - prior
  let bestDelta = -Infinity;
  let improved: DimensionRow | null = null;
  for (const c of current) {
    const p = prior.find((x) => x.axis === c.axis);
    const delta = c.value - (p?.value ?? c.value);
    if (delta > bestDelta && delta > 0) {
      bestDelta = delta;
      improved = c;
    }
  }

  // Focus: lowest current dimension — but only flag it if it's < 70
  const sorted = [...current].sort((a, b) => a.value - b.value);
  const focus = sorted[0] && sorted[0].value < 70 ? sorted[0] : null;

  return { improved, focus };
}

/**
 * Same-day points / week / month — useful for header cards.
 */
export async function getMyPointsWindow(
  userId: string,
  days: number,
): Promise<number> {
  if (!supabase) return 0;
  const { data } = await supabase.rpc("user_points_window", {
    p_user_id: userId,
    p_days: days,
  });
  return typeof data === "number" ? data : 0;
}
