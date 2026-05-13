import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  analyzeCaseSubmission,
  uploadCaseImage,
  getCaseLeaderboard,
  type CaseAnalysis,
} from "@/lib/caseAnalysis";
import { PageShell, PageHeader } from "@/components/PageShell";
import { GlowCard } from "@/components/GlowCard";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auth gate
  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/login", replace: true });
    }
  }, [user, authLoading, navigate]);

  // Load case row + leaderboard
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !caseId) {
      setLoadingCase(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("case_decks")
        .select("id, name, description, category, source")
        .eq("id", caseId)
        .maybeSingle();
      if (cancelled) return;
      setCaseRow((data as CaseRow) ?? null);
      setLoadingCase(false);

      const lb = await getCaseLeaderboard(caseId, 20);
      if (!cancelled) setLeaderboard(lb as LeaderboardRow[]);
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
      setError("Type your answer or attach a photo of your solution.");
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
      // Refresh leaderboard
      const lb = await getCaseLeaderboard(caseId, 20);
      setLeaderboard(lb as LeaderboardRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  const myRank =
    result && user
      ? leaderboard.find((l) => l.user_id === user.id)?.rank ?? null
      : null;

  return (
    <PageShell>
      <PageHeader
        eyebrow="Case"
        title={loadingCase ? "Loading…" : caseRow?.name || "Case not found"}
        subtitle={caseRow?.source || "Solve, submit, see your rank."}
      />
      <div className="mx-auto max-w-[1180px] px-5 md:px-6 pb-20 grid lg:grid-cols-[1fr_360px] gap-8">
        {/* Left: prompt + form OR result */}
        <div className="space-y-6">
          {caseRow?.description && (
            <GlowCard className="p-6">
              <div className="relative z-10">
                <p className="text-[11px] uppercase tracking-[0.08em] text-text-muted font-semibold mb-2">
                  Prompt
                </p>
                <p className="text-[15px] leading-[1.6] whitespace-pre-wrap">
                  {caseRow.description}
                </p>
              </div>
            </GlowCard>
          )}

          {result ? (
            <ResultPanel
              result={result}
              myRank={myRank}
              totalSolvers={leaderboard.length}
              onAgain={() => setResult(null)}
            />
          ) : (
            <GlowCard className="p-6">
              <form onSubmit={handleSubmit} className="relative z-10 space-y-4">
                <p className="text-[11px] uppercase tracking-[0.08em] text-text-muted font-semibold">
                  Your solution
                </p>

                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  rows={8}
                  placeholder="Type your structured approach here, or skip and upload a photo of your handwritten work."
                  className="input-base w-full text-[14px]"
                />

                <div className="border border-dashed border-border rounded-[10px] p-4">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-text-muted font-semibold mb-2">
                    Or attach a photo
                  </p>
                  {filePreview ? (
                    <div className="flex items-start gap-3">
                      <img
                        src={filePreview}
                        alt="Preview"
                        className="w-32 h-32 object-cover rounded-lg border border-border"
                      />
                      <div className="flex-1">
                        <p className="text-[13px] truncate">{file?.name}</p>
                        <p className="text-[12px] text-text-muted">
                          {(file && (file.size / 1024).toFixed(0)) || 0} KB
                        </p>
                        <button
                          type="button"
                          onClick={() => onPickFile(null)}
                          className="mt-2 text-[12px] text-urgent hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-12 border border-border rounded-[8px] text-[13px] text-text-secondary hover:border-orange hover:text-orange transition-colors"
                    >
                      + Upload photo (JPG / PNG, up to 10 MB)
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      if (f && f.size > 10 * 1024 * 1024) {
                        setError("Image too large (max 10 MB).");
                        return;
                      }
                      onPickFile(f);
                    }}
                  />
                </div>

                {error && (
                  <p className="text-[13px] text-urgent" role="alert">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary w-full disabled:opacity-60"
                >
                  {submitting ? "Analyzing with GPT-4o…" : "Submit for AI Analysis"}
                </button>
                <p className="text-[11px] text-text-muted text-center">
                  Your photo and answer are sent to OpenAI for evaluation. Don't include
                  anything you wouldn't share.
                </p>
              </form>
            </GlowCard>
          )}
        </div>

        {/* Right: live leaderboard for this case */}
        <aside className="space-y-4">
          <GlowCard className="p-5">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[14px] font-semibold">Leaderboard</h3>
                <span className="text-[11px] text-text-muted">
                  {leaderboard.length} solver{leaderboard.length === 1 ? "" : "s"}
                </span>
              </div>
              {leaderboard.length === 0 ? (
                <p className="text-[13px] text-text-muted py-6 text-center">
                  Be the first to solve this case!
                </p>
              ) : (
                <ol className="space-y-2">
                  {leaderboard.map((r) => (
                    <li
                      key={r.user_id}
                      className={`flex items-center gap-3 px-2 py-1.5 rounded-md ${
                        user?.id === r.user_id ? "bg-orange/10" : ""
                      }`}
                    >
                      <span className="w-6 text-right text-[12px] font-mono font-semibold text-text-muted">
                        {r.rank}
                      </span>
                      <span className="flex-1 text-[13px] truncate">
                        {r.display_name}
                        {user?.id === r.user_id && (
                          <span className="ml-1 text-orange">(you)</span>
                        )}
                      </span>
                      <span
                        className="text-[13px] font-mono font-semibold"
                        style={{ color: "#E8490F" }}
                      >
                        {r.score}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </GlowCard>

          <Link to="/cases" className="btn-ghost text-[13px] inline-block">
            ← All cases
          </Link>
        </aside>
      </div>
    </PageShell>
  );
}

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
    <GlowCard className="p-8">
      <div className="relative z-10">
        <p className="label-eyebrow">Result</p>
        <div className="mt-3 flex items-end gap-3">
          <p
            className="font-serif text-[64px] leading-none"
            style={{ color: "#E8490F" }}
          >
            {result.overall_score ?? result.score}
          </p>
          <p className="text-[14px] text-text-muted pb-2">/ 100</p>
        </div>
        {myRank ? (
          <p className="mt-2 text-[14px] text-text-secondary">
            You're ranked <strong>#{myRank}</strong> of {totalSolvers} for this case.
          </p>
        ) : null}

        <div className="mt-6 grid grid-cols-4 gap-3">
          {[
            { label: "Framework", value: result.framework_score },
            { label: "Clarity", value: result.clarity },
            { label: "Approach", value: result.approach },
            { label: "Execution", value: result.execution },
          ].map((s) => (
            <div key={s.label} className="card-base p-3 text-center">
              <p className="text-[18px] font-bold" style={{ color: "#E8490F" }}>
                {s.value}
              </p>
              <p className="text-[11px] text-text-muted mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <p className="text-[11px] uppercase tracking-[0.08em] text-text-muted font-semibold">
            Framework detected
          </p>
          <p className="text-[15px] font-semibold mt-1">{result.framework}</p>
        </div>

        <div className="mt-5">
          <p className="text-[11px] uppercase tracking-[0.08em] text-text-muted font-semibold">
            Feedback
          </p>
          <p className="text-[14px] leading-[1.6] mt-1">{result.feedback}</p>
        </div>

        {result.strengths?.length > 0 && (
          <div className="mt-5">
            <p className="text-[11px] uppercase tracking-[0.08em] text-text-muted font-semibold">
              Strengths
            </p>
            <ul className="mt-1 list-disc pl-5 text-[14px] space-y-1">
              {result.strengths.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}
        {result.improvements?.length > 0 && (
          <div className="mt-5">
            <p className="text-[11px] uppercase tracking-[0.08em] text-text-muted font-semibold">
              To improve
            </p>
            <ul className="mt-1 list-disc pl-5 text-[14px] space-y-1">
              {result.improvements.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        <button onClick={onAgain} className="btn-secondary mt-8">
          Try another attempt
        </button>
      </div>
    </GlowCard>
  );
}
