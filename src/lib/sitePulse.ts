import { supabase } from "./supabase";

export interface SitePulse {
  cases_solved_total: number;
  active_streaks: number;
  cases_in_bank: number;
  solving_right_now: number;
}

/**
 * Site-wide live stats for the homepage and dashboard tickers.
 * Falls back to zero values when Supabase isn't reachable.
 */
export async function getSitePulse(): Promise<SitePulse> {
  if (!supabase) {
    return {
      cases_solved_total: 0,
      active_streaks: 0,
      cases_in_bank: 0,
      solving_right_now: 0,
    };
  }
  const { data } = await supabase
    .from("site_pulse")
    .select("*")
    .maybeSingle();
  return (
    (data as SitePulse) || {
      cases_solved_total: 0,
      active_streaks: 0,
      cases_in_bank: 0,
      solving_right_now: 0,
    }
  );
}

/**
 * How many users are actively attempting `caseId` right now.
 * Pass null for the global "anyone solving anything" count.
 */
export async function getLiveAttemptCount(caseId?: string | null): Promise<number> {
  if (!supabase) return 0;
  const { data } = await supabase.rpc("live_attempt_count", {
    p_case_id: caseId ?? null,
  });
  if (typeof data === "number") return data;
  return 0;
}

/**
 * Heartbeat: tell the server we're actively on a case. Idempotent upsert.
 * Call once on mount and every 30s while the user is on the page.
 */
export async function sendHeartbeat(userId: string, caseId: string | null) {
  if (!supabase) return;
  await supabase
    .from("case_attempt_heartbeats")
    .upsert(
      { user_id: userId, case_id: caseId, last_seen: new Date().toISOString() },
      { onConflict: "user_id,case_id" },
    );
}

export function clearHeartbeat(userId: string, caseId: string | null) {
  if (!supabase) return;
  return supabase
    .from("case_attempt_heartbeats")
    .delete()
    .eq("user_id", userId)
    .eq("case_id", caseId ?? null);
}

/**
 * Hook-style helper: returns a setInterval cleanup that pings every 30s.
 * Caller decides when to start/stop.
 */
export function startHeartbeatLoop(
  userId: string,
  caseId: string | null,
): () => void {
  sendHeartbeat(userId, caseId);
  const t = window.setInterval(() => sendHeartbeat(userId, caseId), 30_000);
  return () => {
    window.clearInterval(t);
    clearHeartbeat(userId, caseId);
  };
}
