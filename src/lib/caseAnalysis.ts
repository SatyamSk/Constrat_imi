import { supabase } from "./supabase";

export interface CaseAnalysis {
  submission_id: string;
  framework: string;
  framework_score: number;
  clarity: number;
  approach: number;
  execution: number;
  overall_score: number;
  score: number; // alias of overall_score returned by the API
  feedback: string;
  strengths: string[];
  improvements: string[];
}

export interface AnalyzeCaseInput {
  case_id?: string | null;
  case_prompt: string;
  title?: string;
  answer_text?: string;
  image_url?: string;
}

/**
 * Uploads a photo of the user's handwritten solution to Supabase Storage and
 * returns its public URL.
 *
 * The folder name must equal the user's UID — see migration 005 RLS policy.
 */
export async function uploadCaseImage(
  userId: string,
  file: File,
): Promise<string> {
  if (!supabase) throw new Error("Storage unavailable: Supabase not configured");

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from("case-images")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || `image/${ext}`,
    });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("case-images").getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Calls /api/analyze_case which runs GPT-4o (vision-capable), scores the
 * submission, inserts a row in case_submissions, and refreshes rankings.
 */
export async function analyzeCaseSubmission(
  input: AnalyzeCaseInput,
): Promise<CaseAnalysis> {
  if (!supabase) throw new Error("Auth unavailable: Supabase not configured");
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("You must be logged in to submit a case.");

  const res = await fetch("/api/analyze_case", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(input),
  });

  const data = (await res.json().catch(() => ({}))) as
    | (CaseAnalysis & { error?: string })
    | { error?: string; kind?: string; used?: number; limit?: number; tier?: string };

  if (res.status === 402) {
    const err = new Error(
      `Daily photo limit reached (${(data as any).used ?? "?"}/${(data as any).limit ?? "?"}). Upgrade to Pro for unlimited photo analyses.`,
    );
    (err as any).quotaExceeded = true;
    (err as any).quota = data;
    throw err;
  }

  if (!res.ok) {
    throw new Error(
      ("error" in data && data.error) ||
        `Analysis failed (HTTP ${res.status}). Please try again.`,
    );
  }

  return data as CaseAnalysis;
}

/**
 * Reads the leaderboard view (created in migration 005). Pass the case_id
 * the user just solved to show "your rank vs everyone".
 */
export async function getCaseLeaderboard(caseId: string, limit = 20) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("case_leaderboard")
    .select("user_id, rank, score, display_name, avatar_url")
    .eq("case_id", caseId)
    .order("rank", { ascending: true })
    .limit(limit);
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[caseAnalysis] leaderboard error:", error);
    return [];
  }
  return data ?? [];
}

/**
 * Reads the global leaderboard. Used by the dashboard.
 */
export async function getGlobalLeaderboard(limit = 50) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("global_leaderboard")
    .select(
      "user_id, rank, display_name, avatar_url, cases_solved, guesstimates_completed, total_score, current_streak",
    )
    .order("rank", { ascending: true })
    .limit(limit);
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[caseAnalysis] global leaderboard error:", error);
    return [];
  }
  return data ?? [];
}

/**
 * Returns the logged-in user's row in the global leaderboard, or null.
 */
export async function getMyGlobalRank(userId: string) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("global_leaderboard")
    .select("rank, total_score, cases_solved, guesstimates_completed, current_streak")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[caseAnalysis] my-rank error:", error);
    return null;
  }
  return data;
}
