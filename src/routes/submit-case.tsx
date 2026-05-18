import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  analyzeCaseSubmission,
  uploadCaseImage,
  type CaseAnalysis,
} from "@/lib/caseAnalysis";
import { PageShell, PageHeader } from "@/components/PageShell";
import { GlowCard } from "@/components/GlowCard";
import { PhotoPicker } from "@/components/PhotoPicker";
import { PaywallModal } from "@/components/PaywallModal";

export const Route = createFileRoute("/submit-case")({
  component: SubmitCase,
});

interface CaseSubmission {
  id: string;
  title: string;
  answer: string;
  image_url?: string;
  score: number;
  feedback: string;
  ai_analysis: Record<string, any>;
  submitted_at: string;
}

/**
 * Freeform case submission (no specific case_id). Use this when a user wants
 * to practice with their own prompt. For dedicated per-case attempts with a
 * leaderboard, use /case/$caseId.
 */
function SubmitCase() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [casePrompt, setCasePrompt] = useState("");
  const [title, setTitle] = useState("");
  const [answer, setAnswer] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const [submissions, setSubmissions] = useState<CaseSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CaseAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<CaseSubmission | null>(null);
  const [paywall, setPaywall] = useState<{ used: number; limit: number; tier: string } | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login", replace: true });
      return;
    }
    // If practice.tsx tossed a prompt into sessionStorage, pull it in.
    const pre = sessionStorage.getItem("constrat:prefill_prompt");
    if (pre) {
      setCasePrompt(pre);
      sessionStorage.removeItem("constrat:prefill_prompt");
    }
    loadSubmissions();
  }, [user, authLoading, navigate]);

  async function loadSubmissions() {
    if (!isSupabaseConfigured || !supabase || !user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("case_submissions")
        .select("*")
        .eq("user_id", user.id)
        .order("submitted_at", { ascending: false })
        .limit(20);
      if (data) setSubmissions(data as CaseSubmission[]);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error loading submissions:", err);
    } finally {
      setLoading(false);
    }
  }

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
    if (!casePrompt.trim()) {
      setError("Paste the case prompt so the AI knows what to evaluate against.");
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
        case_id: null,
        case_prompt: casePrompt,
        title: title || undefined,
        answer_text: answer.trim() || undefined,
        image_url: imageUrl,
      });
      setResult(analysis);
      setTitle("");
      setAnswer("");
      setCasePrompt("");
      onPickFile(null);
      await loadSubmissions();
    } catch (err) {
      if (err && typeof err === "object" && (err as any).quotaExceeded) {
        const q = (err as any).quota || {};
        setPaywall({
          used:  q.used  ?? 0,
          limit: q.limit ?? 0,
          tier:  q.tier  ?? "free",
        });
      } else {
        setError(err instanceof Error ? err.message : "Submission failed.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Practice"
        title="Quick Case Submission"
        subtitle="Paste any case prompt, submit your solution (text or photo), get AI feedback. For ranked attempts, browse the case library."
      />
      <div className="mx-auto max-w-[1180px] px-5 md:px-6 pb-20">
        <div className="mb-4">
          <Link to="/cases" className="text-[15px] text-orange hover:underline">
            → Browse curated cases with rankings
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {result ? (
              <ResultPanel result={result} onAgain={() => setResult(null)} />
            ) : (
              <GlowCard className="p-8">
                <div className="relative z-10">
                  <h2 className="text-[20px] font-semibold mb-6">New attempt</h2>

                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="text-[12px] font-semibold text-text-muted mb-2 block">
                        Case prompt *
                      </label>
                      <textarea
                        value={casePrompt}
                        onChange={(e) => setCasePrompt(e.target.value)}
                        placeholder="Paste the case prompt the AI should evaluate your answer against."
                        rows={4}
                        className="input-base w-full text-[15px]"
                      />
                    </div>

                    <div>
                      <label className="text-[12px] font-semibold text-text-muted mb-2 block">
                        Title (optional)
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., Market Entry — Indian EV"
                        className="input-base w-full"
                      />
                    </div>

                    <div>
                      <label className="text-[12px] font-semibold text-text-muted mb-2 block">
                        Your answer
                      </label>
                      <textarea
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        placeholder="Type your structured approach. Or skip and upload a photo below."
                        rows={10}
                        className="input-base w-full text-[15px]"
                      />
                      <p className="text-[11px] text-text-muted mt-1">
                        {answer.length} characters
                      </p>
                    </div>

                    <div className="border border-dashed border-border rounded-[10px] p-4">
                      <p className="text-[11px] uppercase tracking-[0.08em] text-text-muted font-semibold mb-3">
                        Or attach a photo
                      </p>
                      <PhotoPicker
                        file={file}
                        preview={filePreview}
                        onChange={onPickFile}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn-primary w-full disabled:opacity-60"
                    >
                      {submitting ? "Analysing…" : "Submit for AI Analysis"}
                    </button>
                    <p className="text-[11px] text-text-muted text-center">
                      Your solution is scored on framework, clarity, approach, and execution.
                    </p>
                  </form>
                </div>
              </GlowCard>
            )}
          </div>

          <div className="space-y-4">
            <GlowCard className="p-6">
              <div className="relative z-10">
                <h3 className="text-[15px] font-semibold mb-3">Scoring</h3>
                <div className="space-y-2 text-[12px] text-text-secondary">
                  <Row label="Framework" pct="25%" desc="Use a recognised consulting framework." />
                  <Row label="Clarity" pct="20%" desc="Structure, signposting, readability." />
                  <Row label="Approach" pct="35%" desc="Analytical depth, hypothesis-driven thinking." />
                  <Row label="Execution" pct="20%" desc="Concrete, data-backed recommendations." />
                </div>
              </div>
            </GlowCard>
          </div>
        </div>

        {/* Previous submissions */}
        {submissions.length > 0 && (
          <div className="mt-12">
            <h2 className="text-[20px] font-semibold mb-6">Your submissions</h2>
            {loading && (
              <p className="text-[15px] text-text-muted">Loading…</p>
            )}
            <div className="space-y-3">
              {submissions.map((s) => (
                <GlowCard
                  key={s.id}
                  className="p-5 cursor-pointer hover:border-orange/50 transition-colors"
                  onClick={() => setSelectedSubmission(s)}
                >
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-[15px] truncate">{s.title}</h3>
                      <p className="text-[12px] text-text-muted mt-1">
                        {new Date(s.submitted_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[24px] font-bold" style={{ color: "#E8490F" }}>
                        {s.score}
                      </p>
                      <p className="text-[11px] text-text-muted">score</p>
                    </div>
                  </div>
                </GlowCard>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedSubmission && (
        <SubmissionDetailModal
          submission={selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
        />
      )}

      {paywall && (
        <PaywallModal
          used={paywall.used}
          limit={paywall.limit}
          tier={paywall.tier}
          kind="photo_analysis"
          onClose={() => setPaywall(null)}
        />
      )}
    </PageShell>
  );
}

function Row({ label, pct, desc }: { label: string; pct: string; desc: string }) {
  return (
    <div>
      <p className="font-semibold text-text-primary">
        {label} <span className="text-text-muted font-normal">({pct})</span>
      </p>
      <p>{desc}</p>
    </div>
  );
}

function ResultPanel({
  result,
  onAgain,
}: {
  result: CaseAnalysis;
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
          <p className="text-[15px] text-text-muted pb-2">/ 100</p>
        </div>

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
          <p className="text-[15px] leading-[1.6] mt-1">{result.feedback}</p>
        </div>

        {result.strengths?.length > 0 && (
          <div className="mt-5">
            <p className="text-[11px] uppercase tracking-[0.08em] text-text-muted font-semibold">
              Strengths
            </p>
            <ul className="mt-1 list-disc pl-5 text-[15px] space-y-1">
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
            <ul className="mt-1 list-disc pl-5 text-[15px] space-y-1">
              {result.improvements.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        <button onClick={onAgain} className="btn-secondary mt-8">
          Submit another
        </button>
      </div>
    </GlowCard>
  );
}

function SubmissionDetailModal({
  submission,
  onClose,
}: {
  submission: CaseSubmission;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <GlowCard className="max-w-2xl w-full max-h-[85vh] overflow-y-auto p-8">
        <div className="relative z-10">
          <button
            onClick={onClose}
            className="absolute top-0 right-0 text-text-muted hover:text-text-primary"
            aria-label="Close"
          >
            ✕
          </button>

          <h2 className="text-[24px] font-semibold mb-4 pr-8">{submission.title}</h2>
          <p className="text-[12px] text-text-muted mb-6">
            {new Date(submission.submitted_at).toLocaleString()}
          </p>

          <div className="grid grid-cols-4 gap-3 mb-6">
            {[
              { label: "Overall", value: submission.score },
              { label: "Framework", value: submission.ai_analysis?.framework_score ?? 0 },
              { label: "Clarity", value: submission.ai_analysis?.clarity ?? 0 },
              { label: "Approach", value: submission.ai_analysis?.approach ?? 0 },
            ].map((s) => (
              <div key={s.label} className="card-base p-4 text-center">
                <p className="text-[18px] font-bold" style={{ color: "#E8490F" }}>
                  {s.value}
                </p>
                <p className="text-[11px] text-text-muted mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="mb-6">
            <p className="text-[11px] uppercase tracking-[0.08em] text-text-muted font-semibold mb-2">
              Framework
            </p>
            <p className="text-[15px] font-semibold">
              {submission.ai_analysis?.framework || "Not detected"}
            </p>
          </div>

          <div className="mb-6">
            <p className="text-[11px] uppercase tracking-[0.08em] text-text-muted font-semibold mb-2">
              Feedback
            </p>
            <p className="text-[15px] leading-[1.6]">{submission.feedback}</p>
          </div>

          {submission.image_url && (
            <div className="mb-6">
              <p className="text-[11px] uppercase tracking-[0.08em] text-text-muted font-semibold mb-2">
                Photo
              </p>
              <img
                src={submission.image_url}
                alt="Submitted"
                className="max-w-full rounded-lg border border-border"
              />
            </div>
          )}

          <div className="mb-6">
            <p className="text-[11px] uppercase tracking-[0.08em] text-text-muted font-semibold mb-2">
              Your answer
            </p>
            <div className="bg-muted p-4 rounded-lg text-[15px] whitespace-pre-wrap max-h-[240px] overflow-y-auto">
              {submission.answer}
            </div>
          </div>

          <button onClick={onClose} className="btn-primary w-full">
            Close
          </button>
        </div>
      </GlowCard>
    </div>
  );
}
