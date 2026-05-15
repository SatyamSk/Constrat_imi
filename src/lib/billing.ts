import { supabase } from "./supabase";

export type Tier = "free" | "pro";

export interface SubscriptionInfo {
  tier: Tier;
  status: string;
  current_period_end: string | null;
}

export interface QuotaInfo {
  allowed: boolean;
  used: number;
  limit: number;
  tier: Tier;
}

export type QuotaKind = "gd_brief" | "photo_analysis";

/** Read the current user's subscription tier. Defaults to 'free'. */
export async function getMySubscription(
  userId: string,
): Promise<SubscriptionInfo> {
  if (!supabase) return { tier: "free", status: "active", current_period_end: null };
  const { data } = await supabase
    .from("subscriptions")
    .select("tier, status, current_period_end")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return { tier: "free", status: "active", current_period_end: null };
  return {
    tier: (data.tier as Tier) ?? "free",
    status: data.status ?? "active",
    current_period_end: data.current_period_end ?? null,
  };
}

/** Pre-flight quota check (read-only, doesn't decrement). */
export async function checkQuota(
  userId: string,
  kind: QuotaKind,
): Promise<QuotaInfo> {
  if (!supabase) {
    return { allowed: true, used: 0, limit: 0, tier: "free" };
  }
  const { data, error } = await supabase.rpc("check_quota", {
    p_user_id: userId,
    p_kind: kind,
  });
  if (error || !data || !data[0]) {
    // Fail open — don't block users if quota infra is misconfigured.
    return { allowed: true, used: 0, limit: 0, tier: "free" };
  }
  const row = data[0] as { allowed: boolean; used: number; limit: number; tier: Tier };
  return row;
}

/** Generate a GD brief for one news article. Server enforces quota. */
export async function generateBrief(newsId: string) {
  if (!supabase) throw new Error("Supabase not configured");
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Login required");

  const res = await fetch("/api/generate_brief", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ news_id: newsId }),
  });

  const json = await res.json().catch(() => ({}));
  if (res.status === 402) {
    const err = new Error("Daily brief limit reached. Upgrade to Pro for more.");
    (err as any).quotaExceeded = true;
    (err as any).quota = json;
    throw err;
  }
  if (!res.ok) {
    throw new Error(json.error || `Brief generation failed (HTTP ${res.status})`);
  }
  return json as { gd_analysis: any; cached?: boolean; used?: number; limit?: number; tier?: Tier };
}
