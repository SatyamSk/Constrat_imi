import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  analyzeCaseSubmission,
  uploadCaseImage,
  getCaseLeaderboard,
  type CaseAnalysis,
} from "@/lib/caseAnalysis";
import { Nav } from "@/components/Nav";
import { PhotoPicker } from "@/components/PhotoPicker";
import { PaywallModal } from "@/components/PaywallModal";
import {
  startHeartbeatLoop,
  getLiveAttemptCount,
} from "@/lib/sitePulse";

export const Route = createFileRoute("/case/$caseId")({ component: CaseDetail });

interface CaseRow {
  id: string;
  name: string;
  description?: string;
  category?: string;
  source?: string;
}

interface LeaderboardRow {
  user_id: string;
  rank: number;
  score: number;
  display_name: string;
  avatar_url?: string;
}

function CaseDetail() {
  const { caseId } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [caseRow, setCaseRow] = useState<CaseRow | null>(null);
  const [answer, setAnswer] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CaseAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [loadingCase, setLoadingCase] = useState(true);
  const [liveCount, setLiveCount] = useState(0);
  const [elapsed, setElapsed] = useState(0); // seconds since landing
  const [paywall, setPaywall] = useState<{ used: number; limit: number; tier: string } | null>(null);

  // Auth gate
  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/login", replace: true });
    }
  }, [user, authLoading, navigate]);

  // Heartbeat — "X solving right now"
  useEffect(() => {
    if (!user || !caseId) return;
    const stop = startHeartbeatLoop(user.id, caseId);
    return stop;
  }, [user, caseId]);

  // Refresh live count every 15s
  useEffect(() => {
    if (!caseId) return;
    let cancelled = false;
    async function tick() {
      const c = await getLiveAttemptCount(caseId);
      if (!cancelled) setLiveCount(c);
    }
    tick();
    const t = window.setInterval(tick, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [caseId]);

  // Elapsed timer
  useEffect(() => {
    const t = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(t);
  }, []);

  // Load case + leaderboard
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Try database first
      if (isSupabaseConfigured && supabase && caseId) {
        const { data } = await supabase
          .from("case_decks")
          .select("id, name, description, category, source")
          .eq("id", caseId)
          .maybeSingle();
        if (cancelled) return;
        if (data) {
          setCaseRow(data as CaseRow);
          setLoadingCase(false);
          const lb = await getCaseLeaderboard(caseId, 10);
          if (!cancelled) setLeaderboard(lb as LeaderboardRow[]);
          return;
        }
      }
      // Fallback: read from sessionStorage (set by cases.tsx for non-UUID IDs)
      const cached = sessionStorage.getItem(`constrat:case:${caseId}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (!cancelled) setCaseRow({ id: caseId, name: parsed.name, description: parsed.description, category: parsed.category, source: parsed.source });
        } catch { /* ignore */ }
      }
      if (!cancelled) setLoadingCase(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  function onPickFile(f: File | null) {
    setFile(f);
    setFilePreview(f ? URL.createObjectURL(f) : null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!answer.trim() && !file) {
      setError("Type your structure or attach a photo of your solution.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      let imageUrl: string | undefined;
      if (file) {
        imageUrl = await uploadCaseImage(user.id, file);
      }
      const analysis = await analyzeCaseSubmission({
        case_id: caseId,
        case_prompt: caseRow?.description || caseRow?.name || "(no prompt available)",
        title: caseRow?.name,
        answer_text: answer.trim() || undefined,
        image_url: imageUrl,
      });
      setResult(analysis);
      setAnswer("");
      onPickFile(null);
      const lb = await getCaseLeaderboard(caseId, 10);
      setLeaderboard(lb as LeaderboardRow[]);
    } catch (err) {
      if (err && typeof err === "object" && (err as any).quotaExceeded) {
        const q = (err as any).quota || {};
        setPaywall({
          used: q.used ?? 0,
          limit: q.limit ?? 0,
          tier: q.tier ?? "free",
        });
      } else {
        setError(err instanceof Error ? err.message : "Submission failed.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const myRank =
    result && user
      ? leaderboard.find((l) => l.user_id === user.id)?.rank ?? null
      : null;

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#ffffff" }}>
      <Nav />

      {/* Top razor strip */}
      <div
        className="h-11 px-5 md:px-6 flex items-center justify-between"
        style={{ background: "#0a1628" }}
      >
        <div className="flex items-center gap-2 text-white/50 text-[13px] font-light">
          <Link to="/practice" className="hover:text-white">Case Bank</Link>
          <span>→</span>
          <span className="text-white">{caseRow?.name || "Case"}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="pulse-dot" />
            <span className="text-white text-[11px] font-light">
              LIVE · {liveCount} solving
            </span>
          </div>
          <div
            className="text-[#e8490f] font-bold tabular-nums"
            style={{ fontSize: "16px" }}
          >
            {mins.toString().padStart(2, "0")}:{secs.toString().padStart(2, "0")}
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* LEFT — CASE WORKSPACE */}
        <main className="flex-1 min-w-0">
          {/* CASE BRIEF */}
          <section
            className="px-5 md:px-6 py-7 grid-bg"
            style={{ borderBottom: "1px solid #e2e8f0" }}
          >
            <div className="max-w-[760px] mx-auto">
              {loadingCase ? (
                <p className="text-[#8a9bb0] text-[14px]">Loading case…</p>
              ) : (
                <div className="accent-rule">
                  <span className="text-[10px] uppercase tracking-[0.1em] font-bold text-[#e8490f]">
                    {caseRow?.source || "AI Case"} · {caseRow?.category || "General"}
                  </span>
                  <h1
                    className="mt-3 font-medium text-[#0a1628]"
                    style={{ fontSize: "18px", letterSpacing: "-0.01em", lineHeight: 1.5 }}
                  >
                    {caseRow?.description ||
                      caseRow?.name ||
                      "Your client wants a market sizing estimate. Build a structured approach."}
                  </h1>
                  <p className="mt-4 text-[11px] text-[#8a9bb0] font-light">
                    Difficulty: {caseRow?.category || "Medium"} · Est. 25 min · {liveCount} attempting now
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* WORKSPACE */}
          {result ? (
            <ResultPanel
              result={result}
              myRank={myRank}
              totalSolvers={leaderboard.length}
              onAgain={() => setResult(null)}
            />
          ) : (
            <section className="grid-workspace" style={{ minHeight: "500px" }}>
              <div className="max-w-[760px] mx-auto px-5 md:px-6 py-8">
                <p className="label-eyebrow">YOUR STRUCTURE</p>

                <form onSubmit={handleSubmit} className="mt-4 space-y-5">
                  <textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    rows={12}
                    placeholder="Build your framework here. Use bullets like:&#10;&#10;1. Define the market&#10;   - Premium segment = ?&#10;   - Geographic scope = ?&#10;&#10;2. Size top-down&#10;   - Pet HHs × adoption % × spend&#10;&#10;3. Key assumption to flag..."
                    className="w-full bg-white/80 backdrop-blur p-5 text-[14px] font-mono leading-[1.7] text-[#0a1628] resize-y outline-none"
                    style={{
                      border: "1px solid #c8d8e8",
                      borderRadius: "4px",
                      minHeight: "320px",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  />

                  <div
                    className="bg-white/80 backdrop-blur p-4"
                    style={{ border: "1px dashed #c8d8e8", borderRadius: "4px" }}
                  >
                    <p className="label-eyebrow mb-3">OR ATTACH HANDWRITTEN STRUCTURE</p>
                    <PhotoPicker file={file} preview={filePreview} onChange={onPickFile} />
                  </div>

                  {error && (
                    <p className="text-[13px] text-[#dc2626]" role="alert">
                      {error}
                    </p>
                  )}

                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn-primary h-12 px-7 text-[14px] disabled:opacity-60"
                    >
                      {submitting ? "Analysing with GPT-4o…" : "Submit Structure →"}
                    </button>
                    <p className="text-[11px] text-[#8a9bb0] font-light">
                      Photo submissions count against your daily quota. Text-only is unlimited.
                    </p>
                  </div>
                </form>
              </div>
            </section>
          )}
        </main>

        {/* RIGHT — DARK NAVY BENCHMARKS PANEL */}
        <aside
          className="hidden lg:flex flex-col w-[280px] shrink-0 grid-bg-dark"
        >
          <div className="p-6 space-y-7 flex-1">
            {/* Live benchmarks */}
            <div>
              <div className="flex items-baseline justify-between">
                <p
                  className="text-white font-bold"
                  style={{ fontSize: "11px", letterSpacing: "0.05em" }}
                >
                  LIVE BENCHMARKS
                </p>
                <p className="text-white/40 text-[10px]">
                  {liveCount} attempting
                </p>
              </div>
              <div className="mt-3">
                {leaderboard.length === 0 ? (
                  <p className="text-white/40 text-[11px] py-2 font-light">
                    Be the first to solve this case.
                  </p>
                ) : (
                  leaderboard.slice(0, 6).map((row) => (
                    <BenchmarkRow
                      key={row.user_id}
                      row={row}
                      isYou={row.user_id === user?.id}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Structure checklist */}
            <div>
              <p
                className="text-white font-bold"
                style={{ fontSize: "11px", letterSpacing: "0.05em" }}
              >
                STRUCTURE CHECKLIST
              </p>
              <div className="mt-3 space-y-2">
                <ChecklistItem checked={answer.length > 50} label="Market clearly defined" />
                <ChecklistItem
                  checked={(answer.match(/\d/g)?.length ?? 0) >= 2}
                  label="Numbers / quantification present"
                />
                <ChecklistItem
                  checked={(answer.match(/\n/g)?.length ?? 0) >= 4}
                  label="3+ logical levels"
                />
                <ChecklistItem
                  checked={/assum|hypothesi|because/i.test(answer)}
                  label="Key assumption stated"
                />
              </div>
            </div>

            {/* Hint accordion */}
            <div>
              <button
                className="w-full text-left text-white/60 hover:text-white transition-colors flex items-center justify-between"
                style={{ fontSize: "13px", fontWeight: 300 }}
                onClick={() => alert("Hints will be available in a future release.")}
              >
                <span>Smart Hint — costs 5 points</span>
                <span className="text-[#e8490f]">→</span>
              </button>
            </div>

            {/* Bottom: back link */}
            <div className="pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <Link
                to="/practice"
                className="text-white/40 hover:text-white text-[11px] font-light"
              >
                ← Back to case bank
              </Link>
            </div>
          </div>
        </aside>
      </div>

      {paywall && (
        <PaywallModal
          used={paywall.used}
          limit={paywall.limit}
          tier={paywall.tier}
          kind="photo_analysis"
          onClose={() => setPaywall(null)}
        />
      )}
    </div>
  );
}

/* ============ BENCHMARK ROW ============ */
function BenchmarkRow({
  row,
  isYou,
}: {
  row: LeaderboardRow;
  isYou: boolean;
}) {
  return (
    <div
      className="flex items-center gap-2 py-1.5 px-2 -mx-2"
      style={{
        background: isYou ? "rgba(232,73,15,0.12)" : "transparent",
        borderLeft: isYou ? "2px solid #e8490f" : "2px solid transparent",
      }}
    >
      <span
        className="font-bold text-white/90 tabular-nums w-4 text-right"
        style={{ fontSize: "11px" }}
      >
        {row.rank}
      </span>
      <span
        className="w-5 h-5 rounded-full flex items-center justify-center font-semibold"
        style={{
          background: "rgba(255,255,255,0.1)",
          color: "white",
          fontSize: "8px",
        }}
      >
        {(row.display_name || "U")
          .split(/\s+/)
          .map((s) => s[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()}
      </span>
      <div className="flex-1 min-w-0">
        <p
          className="text-white/85 truncate font-light"
          style={{ fontSize: "10px" }}
        >
          {row.display_name}
          {isYou && (
            <span className="ml-1 text-[#e8490f] font-bold" style={{ fontSize: "8px" }}>
              YOU
            </span>
          )}
        </p>
        <div className="mt-1 h-1 bg-white/10">
          <div
            className="h-full bg-[#e8490f]"
            style={{ width: `${Math.min(100, row.score)}%` }}
          />
        </div>
      </div>
      <span
        className="font-bold text-[#e8490f] tabular-nums"
        style={{ fontSize: "11px" }}
      >
        {row.score}
      </span>
    </div>
  );
}

function ChecklistItem({ checked, label }: { checked: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="w-3 h-3 inline-block"
        style={{
          background: checked ? "#e8490f" : "transparent",
          border: checked ? "none" : "1px solid #e8490f",
        }}
      />
      <span
        className="text-white/85 font-light"
        style={{ fontSize: "11px" }}
      >
        {label}
      </span>
    </div>
  );
}

/* ============ RESULT PANEL ============ */
function ResultPanel({
  result,
  myRank,
  totalSolvers,
  onAgain,
}: {
  result: CaseAnalysis;
  myRank: number | null;
  totalSolvers: number;
  onAgain: () => void;
}) {
  return (
    <section className="grid-bg" style={{ minHeight: "500px" }}>
      <div className="max-w-[760px] mx-auto px-5 md:px-6 py-10">
        <p className="label-orange">Result</p>
        <div className="mt-3 flex items-end gap-3">
          <p
            className="font-bold text-[#e8490f] tabular-nums"
            style={{ fontSize: "72px", lineHeight: 1, letterSpacing: "-0.03em" }}
          >
            {result.overall_score ?? result.score}
          </p>
          <p className="text-[#8a9bb0] pb-3 font-light">/ 100</p>
        </div>
        {myRank ? (
          <p className="mt-2 text-[15px] text-[#4a5d76]">
            Ranked <strong className="text-[#0a1628]">#{myRank}</strong> of {totalSolvers} solvers.
          </p>
        ) : null}

        <div className="mt-6 grid grid-cols-4 gap-0 border border-[#e2e8f0]">
          {[
            { label: "Framework", value: result.framework_score },
            { label: "Clarity", value: result.clarity },
            { label: "Approach", value: result.approach },
            { label: "Execution", value: result.execution },
          ].map((s, i) => (
            <div
              key={s.label}
              className="p-4 text-center"
              style={{
                background: "rgba(255,255,255,0.62)",
                backdropFilter: "blur(2px)",
                WebkitBackdropFilter: "blur(2px)",
                borderRight: i < 3 ? "1px solid #e2e8f0" : "none",
              }}
            >
              <p
                className="font-bold text-[#0a1628] tabular-nums"
                style={{ fontSize: "22px", letterSpacing: "-0.02em" }}
              >
                {s.value}
              </p>
              <p className="label-eyebrow mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 surface-flat p-5">
          <p className="label-eyebrow">FRAMEWORK DETECTED</p>
          <p className="mt-1 text-[16px] font-bold text-[#0a1628]">{result.framework}</p>

          <p className="label-eyebrow mt-5">FEEDBACK</p>
          <p className="mt-1 text-[14px] text-[#0a1628] leading-[1.6]">{result.feedback}</p>

          {result.strengths?.length > 0 && (
            <div className="mt-5">
              <p className="label-eyebrow">STRENGTHS</p>
              <ul className="mt-2 space-y-1.5">
                {result.strengths.map((s, i) => (
                  <li
                    key={i}
                    className="text-[14px] text-[#0a1628] flex gap-2"
                  >
                    <span className="text-[#16a34a] font-bold">+</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result.improvements?.length > 0 && (
            <div className="mt-5">
              <p className="label-eyebrow">TO IMPROVE</p>
              <ul className="mt-2 space-y-1.5">
                {result.improvements.map((s, i) => (
                  <li
                    key={i}
                    className="text-[14px] text-[#0a1628] flex gap-2"
                  >
                    <span className="text-[#e8490f] font-bold">→</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <button onClick={onAgain} className="btn-secondary mt-7">
          Try Another Attempt
        </button>
      </div>
    </section>
  );
}
