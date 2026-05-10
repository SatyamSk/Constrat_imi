import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  analyzeCaseSubmission,
  saveCaseAnalysis,
  updateCaseRankings,
  getCaseRankings,
  type CaseAnalysis,
} from "@/lib/caseAnalysis";
import { trackActivity } from "@/lib/activityTracker";
import { PageShell, PageHeader } from "@/components/PageShell";
import { GlowCard } from "@/components/GlowCard";

export const Route = createFileRoute("/submit-case")({
  component: SubmitCase,
});

interface CaseSubmission {
  id: string;
  title: string;
  answer: string;
  score: number;
  feedback: string;
  ai_analysis: Record<string, any>;
  submitted_at: string;
}

interface CaseRanking {
  user_id: string;
  name: string;
  score: number;
  rank: number;
}

function SubmitCase() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [caseId, setCaseId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [answer, setAnswer] = useState("");
  const [submissions, setSubmissions] = useState<CaseSubmission[]>([]);
  const [rankings, setRankings] = useState<CaseRanking[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<CaseSubmission | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    loadSubmissions();
  }, [user, authLoading]);

  const loadSubmissions = async () => {
    if (!isSupabaseConfigured || !supabase || !user) return;

    setLoading(true);
    try {
      const { data } = await supabase
        .from("case_submissions")
        .select("*")
        .eq("user_id", user.id)
        .order("submitted_at", { ascending: false });

      if (data) {
        setSubmissions(data as CaseSubmission[]);
      }
    } catch (err) {
      console.error("Error loading submissions:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isSupabaseConfigured || !supabase || !answer.trim()) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Analyze the case
      const analysis = await analyzeCaseSubmission(answer);

      // Save to database
      const { data: saved, error: insertError } = await supabase
        .from("case_submissions")
        .insert({
          user_id: user.id,
          case_id: caseId,
          title: title || `Case Submission #${submissions.length + 1}`,
          answer,
          score: analysis.overall_score,
          feedback: analysis.feedback,
          ai_analysis: {
            framework: analysis.framework,
            clarity: analysis.clarity,
            approach: analysis.approach,
            execution: analysis.execution,
          },
        })
        .select();

      if (insertError) {
        console.error("Supabase insert error:", insertError);
        setError(`Failed to submit case: ${insertError.message}`);
        setSubmitting(false);
        return;
      }

      if (saved && saved.length > 0) {
        // Track activity
        await trackActivity({
          type: "CASE_SOLVED",
          userId: user.id,
          points: Math.floor(analysis.overall_score / 10),
        });

        // Update rankings if case_id is provided
        if (caseId) {
          await updateCaseRankings(caseId);
        }

        // Reset form
        setTitle("");
        setAnswer("");
        setCaseId(null);
        clearMessages();

        // Reload submissions
        await loadSubmissions();
        setSuccess("✅ Case submitted successfully! Score: " + analysis.overall_score);
      } else {
        throw new Error("No data returned from submission");
      }
    } catch (err) {
      console.error("Error submitting case:", err);
      setError("Error submitting case: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setSubmitting(false);
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Practice"
        title="Case Submission"
        subtitle="Solve cases and get AI-powered analysis on your approach and execution."
      />
      <div className="mx-auto max-w-[1180px] px-5 md:px-6 pb-20">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Submission Form */}
          <div className="md:col-span-2">
            <GlowCard className="p-8">
              <div className="relative z-10">
                <h2 className="text-[20px] font-semibold mb-6">New Case</h2>

                {/* Error Message */}
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}

                {/* Success Message */}
                {success && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                    {success}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-[12px] font-semibold text-text-muted mb-2 block">
                      Case Title (Optional)
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        clearMessages();
                      }}
                      placeholder="e.g., Market Entry Strategy for Indian EV Market"
                      className="input-base w-full"
                    />
                  </div>

                  <div>
                    <label className="text-[12px] font-semibold text-text-muted mb-2 block">
                      Your Answer
                    </label>
                    <textarea
                      value={answer}
                      onChange={(e) => {
                        setAnswer(e.target.value);
                        clearMessages();
                      }}
                      placeholder="Write your case solution here. Use headings, bullet points, and structured frameworks for better analysis."
                      rows={12}
                      className="input-base w-full font-mono text-[13px]"
                    />
                    <p className="text-[11px] text-text-muted mt-1">{answer.length} characters</p>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !answer.trim()}
                    className="btn-primary w-full disabled:opacity-50"
                  >
                    {submitting ? "Analyzing..." : "Submit Case"}
                  </button>
                </form>
              </div>
            </GlowCard>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <GlowCard className="p-6">
              <div className="relative z-10">
                <h3 className="text-[14px] font-semibold mb-3">Scoring Criteria</h3>
                <div className="space-y-2 text-[12px] text-text-secondary">
                  <div>
                    <p className="font-semibold text-text-primary">Framework (25%)</p>
                    <p>Use recognized consulting frameworks like 4Ps, SWOT, etc.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary">Clarity (25%)</p>
                    <p>Clear structure, bullet points, and logical flow.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary">Approach (35%)</p>
                    <p>Strong analytical thinking and problem breakdown.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary">Execution (15%)</p>
                    <p>Concrete recommendations backed by data.</p>
                  </div>
                </div>
              </div>
            </GlowCard>
          </div>
        </div>

        {/* Previous Submissions */}
        {submissions.length > 0 && (
          <div className="mt-12">
            <h2 className="text-[20px] font-semibold mb-6">Your Submissions</h2>
            <div className="space-y-3">
              {submissions.map((submission) => (
                <GlowCard
                  key={submission.id}
                  className="p-5 cursor-pointer hover:border-orange/50 transition-colors"
                  onClick={() => setSelectedSubmission(submission)}
                >
                  <div className="relative z-10 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-[15px]">{submission.title}</h3>
                      <p className="text-[12px] text-text-muted mt-1">
                        {new Date(submission.submitted_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[24px] font-bold" style={{ color: "#E8490F" }}>
                        {submission.score}
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

      {/* Detail Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <GlowCard className="max-w-2xl w-full max-h-[80vh] overflow-y-auto p-8">
            <div className="relative z-10">
              <button
                onClick={() => setSelectedSubmission(null)}
                className="absolute top-4 right-4 text-text-muted hover:text-text-primary"
              >
                ✕
              </button>

              <h2 className="text-[24px] font-semibold mb-4">{selectedSubmission.title}</h2>

              {/* Scores */}
              <div className="grid grid-cols-4 gap-3 mb-6">
                {[
                  {
                    label: "Overall",
                    value: selectedSubmission.score,
                  },
                  {
                    label: "Clarity",
                    value: selectedSubmission.ai_analysis?.clarity || 0,
                  },
                  {
                    label: "Approach",
                    value: selectedSubmission.ai_analysis?.approach || 0,
                  },
                  {
                    label: "Execution",
                    value: selectedSubmission.ai_analysis?.execution || 0,
                  },
                ].map((score) => (
                  <div key={score.label} className="card-base p-4 text-center">
                    <p className="text-[18px] font-bold" style={{ color: "#E8490F" }}>
                      {score.value}
                    </p>
                    <p className="text-[11px] text-text-muted mt-1">{score.label}</p>
                  </div>
                ))}
              </div>

              {/* Framework */}
              <div className="mb-6">
                <p className="text-[12px] font-semibold text-text-muted mb-2 uppercase">
                  Framework Detected
                </p>
                <p className="text-[16px] font-semibold">
                  {selectedSubmission.ai_analysis?.framework || "Not Detected"}
                </p>
              </div>

              {/* Feedback */}
              <div className="mb-6">
                <p className="text-[12px] font-semibold text-text-muted mb-2 uppercase">Feedback</p>
                <p className="text-[14px] leading-[1.6]">{selectedSubmission.feedback}</p>
              </div>

              {/* Answer */}
              <div className="mb-6">
                <p className="text-[12px] font-semibold text-text-muted mb-2 uppercase">
                  Your Answer
                </p>
                <div className="bg-muted p-4 rounded-lg text-[13px] whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                  {selectedSubmission.answer}
                </div>
              </div>

              <button onClick={() => setSelectedSubmission(null)} className="btn-primary w-full">
                Close
              </button>
            </div>
          </GlowCard>
        </div>
      )}
    </PageShell>
  );
}
