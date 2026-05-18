import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { PageShell } from "@/components/PageShell";
import { RadarChart } from "@/components/RadarChart";
import { LineChart } from "@/components/LineChart";
import {
  getMyPercentiles,
  getMyProgression,
  getMyDimensions,
  getMyPointsWindow,
  deriveInsights,
  type PercentileSet,
  type ProgressionPoint,
  type DimensionRow,
  type AttemptType,
} from "@/lib/analytics";

export const Route = createFileRoute("/analytics")({
  component: Analytics,
  head: () => ({
    meta: [
      { title: "Analytics — Constrat" },
      {
        name: "description",
        content:
          "Your performance over time. Percentile rank, dimension breakdown, score progression, and where to focus next.",
      },
    ],
  }),
});

function Analytics() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [kind, setKind] = useState<AttemptType["kind"]>("case");
  const [percentiles, setPercentiles] = useState<PercentileSet | null>(null);
  const [progression, setProgression] = useState<ProgressionPoint[]>([]);
  const [dimensions, setDimensions] = useState<{
    current: DimensionRow[];
    prior: DimensionRow[];
    n: number;
  }>({ current: [], prior: [], n: 0 });
  const [streak, setStreak] = useState(0);
  const [totalSolved, setTotalSolved] = useState(0);
  const [pointsToday, setPointsToday] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login", replace: true });
      return;
    }
    setLoading(true);
    Promise.all([
      getMyPercentiles(user.id),
      getMyProgression(user.id, kind, 50),
      getMyDimensions(user.id, kind, 30),
      getMyPointsWindow(user.id, 1),
      supabase
        ? supabase
            .from("user_statistics")
            .select("current_streak, cases_solved, guesstimates_completed")
            .eq("user_id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]).then(([p, pr, dim, pts, statsRow]: any[]) => {
      setPercentiles(p);
      setProgression(pr);
      setDimensions(dim);
      setPointsToday(pts);
      setStreak(statsRow?.data?.current_streak ?? 0);
      setTotalSolved(
        kind === "case"
          ? statsRow?.data?.cases_solved ?? 0
          : statsRow?.data?.guesstimates_completed ?? 0,
      );
      setLoading(false);
    });
  }, [user, authLoading, navigate, kind]);

  const { improved, focus } = deriveInsights(
    dimensions.current,
    dimensions.prior,
  );

  return (
    <PageShell>
      <section className="grid-bg">
        <div className="mx-auto max-w-[1280px] px-5 md:px-6 py-12 md:py-16">
          {/* Header */}
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <span className="label-orange">Analytics</span>
              <h1
                className="mt-4 font-bold text-[#0a1628]"
                style={{
                  fontSize: "clamp(32px, 4.5vw, 48px)",
                  letterSpacing: "-0.025em",
                  lineHeight: 1.05,
                }}
              >
                Where you stand. Where to look.
              </h1>
              <p className="mt-3 text-[#4a5d76] font-light max-w-[620px] leading-[1.65]">
                Your percentile vs everyone solving, dimension breakdown, and one
                focus area for the week.
              </p>
            </div>

            {/* Type toggle */}
            <div
              className="inline-flex p-1"
              style={{
                background: "rgba(255,255,255,0.62)",
                backdropFilter: "blur(2px)",
                WebkitBackdropFilter: "blur(2px)",
                border: "1px solid #e2e8f0",
                borderRadius: 4,
              }}
            >
              <Toggle
                active={kind === "case"}
                onClick={() => setKind("case")}
                label="Cases"
              />
              <Toggle
                active={kind === "guesstimate"}
                onClick={() => setKind("guesstimate")}
                label="Guesstimates"
              />
            </div>
          </div>

          {/* Quick stats strip */}
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-0 border border-[#e2e8f0]">
            <Stat label="Streak"        value={streak.toString()}        />
            <Stat label={`${kind === "case" ? "Cases" : "Guesstimates"} solved`} value={totalSolved.toString()} />
            <Stat label="Today's points" value={pointsToday > 0 ? `+${pointsToday}` : "—"} accent />
            <Stat label="Total attempts" value={progression.length.toString()} last />
          </div>
        </div>
      </section>

      {/* Percentile cards */}
      <section className="grid-bg" style={{ borderTop: "1px solid #e2e8f0" }}>
        <div className="mx-auto max-w-[1280px] px-5 md:px-6 py-12">
          <h2
            className="font-bold text-[#0a1628]"
            style={{
              fontSize: "clamp(22px, 2.6vw, 30px)",
              letterSpacing: "-0.02em",
            }}
          >
            Percentile rank
          </h2>
          <p className="mt-2 text-[14px] text-[#8a9bb0]">
            Where you sit versus everyone solving on Constrat.
          </p>

          <div className="mt-6 grid sm:grid-cols-3 gap-4">
            <PercentileCard
              label="Last 7 days"
              value={percentiles?.weekly ?? 0}
              loading={loading}
            />
            <PercentileCard
              label="Last 30 days"
              value={percentiles?.monthly ?? 0}
              loading={loading}
              big
            />
            <PercentileCard
              label="All time"
              value={percentiles?.overall ?? 0}
              loading={loading}
            />
          </div>
        </div>
      </section>

      {/* Radar + Insights */}
      <section className="grid-bg" style={{ borderTop: "1px solid #e2e8f0" }}>
        <div className="mx-auto max-w-[1280px] px-5 md:px-6 py-12 grid lg:grid-cols-[1fr_360px] gap-10">
          {/* Radar */}
          <div>
            <h2
              className="font-bold text-[#0a1628]"
              style={{
                fontSize: "clamp(22px, 2.6vw, 30px)",
                letterSpacing: "-0.02em",
              }}
            >
              Dimension breakdown
            </h2>
            <p className="mt-2 text-[14px] text-[#8a9bb0]">
              Last 30 days (orange) versus the prior period (dashed).
            </p>

            <div
              className="mt-6 p-6 flex items-center justify-center"
              style={{
                background: "rgba(255,255,255,0.62)",
                backdropFilter: "blur(2px)",
                WebkitBackdropFilter: "blur(2px)",
                border: "1px solid #e2e8f0",
                borderRadius: 4,
                minHeight: 360,
              }}
            >
              {dimensions.n === 0 ? (
                <p className="text-[#8a9bb0] text-[13px] text-center max-w-[280px]">
                  Submit your first {kind === "case" ? "case" : "guesstimate"} to
                  see your dimension breakdown.
                </p>
              ) : (
                <RadarChart
                  current={dimensions.current}
                  prior={dimensions.prior}
                  size={360}
                />
              )}
            </div>
          </div>

          {/* Insights */}
          <div className="space-y-4">
            <h3 className="label-eyebrow">Insights</h3>
            {dimensions.n === 0 ? (
              <p className="text-[14px] text-[#8a9bb0] mt-2 leading-[1.6]">
                Once you've submitted a few attempts, this panel will surface
                what you've improved on, and one focus area for the week.
              </p>
            ) : (
              <>
                {improved && (
                  <InsightCard
                    tone="positive"
                    title="What you've gotten better at"
                    body={`${improved.axis} is up to ${improved.value}/100 — keep doing what's working.`}
                  />
                )}
                {focus && (
                  <InsightCard
                    tone="focus"
                    title="One thing to focus on this week"
                    body={focusTipFor(focus, kind)}
                  />
                )}
                {!improved && !focus && (
                  <InsightCard
                    tone="positive"
                    title="You're holding steady"
                    body={`Your dimensions are balanced and above the threshold. Stretch with a harder case to push the ceiling.`}
                  />
                )}
                <p className="text-[11px] text-[#8a9bb0] mt-3 leading-[1.6]">
                  Insights compare your last 30 days to the prior 30 days. They
                  don't change day-to-day — you only see them once a week of new
                  data is in.
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Progression */}
      <section className="grid-bg" style={{ borderTop: "1px solid #e2e8f0" }}>
        <div className="mx-auto max-w-[1280px] px-5 md:px-6 py-12">
          <div className="flex items-end justify-between flex-wrap gap-3">
            <div>
              <h2
                className="font-bold text-[#0a1628]"
                style={{
                  fontSize: "clamp(22px, 2.6vw, 30px)",
                  letterSpacing: "-0.02em",
                }}
              >
                Score progression
              </h2>
              <p className="mt-2 text-[14px] text-[#8a9bb0]">
                Your last {progression.length || 50}{" "}
                {kind === "case" ? "case" : "guesstimate"} attempts.
                {progression.length === 50 && (
                  <>
                    {" "}
                    <Link
                      to="/account"
                      className="text-[#e8490f] hover:underline"
                    >
                      See full history →
                    </Link>
                  </>
                )}
              </p>
            </div>
          </div>

          <div
            className="mt-6 p-4 md:p-6"
            style={{
              background: "rgba(255,255,255,0.62)",
              backdropFilter: "blur(2px)",
              WebkitBackdropFilter: "blur(2px)",
              border: "1px solid #e2e8f0",
              borderRadius: 4,
            }}
          >
            <LineChart data={progression} height={240} />
          </div>
        </div>
      </section>
    </PageShell>
  );
}

/* ============ HELPERS ============ */

function Toggle({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 text-[13px] font-semibold transition-colors"
      style={{
        background: active ? "#0a1628" : "transparent",
        color: active ? "#ffffff" : "#4a5d76",
        borderRadius: 2,
      }}
    >
      {label}
    </button>
  );
}

function Stat({
  label,
  value,
  accent = false,
  last = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
  last?: boolean;
}) {
  return (
    <div
      className="px-5 py-5"
      style={{
        background: "rgba(255,255,255,0.62)",
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(2px)",
        borderRight: last ? "none" : "1px solid #e2e8f0",
      }}
    >
      <p
        className="text-[10px] uppercase font-bold text-[#8a9bb0]"
        style={{ letterSpacing: "0.12em" }}
      >
        {label}
      </p>
      <p
        className="mt-2 font-bold tabular-nums"
        style={{
          fontSize: 32,
          letterSpacing: "-0.025em",
          lineHeight: 1,
          color: accent ? "#e8490f" : "#0a1628",
        }}
      >
        {value}
      </p>
    </div>
  );
}

function PercentileCard({
  label,
  value,
  loading,
  big = false,
}: {
  label: string;
  value: number;
  loading: boolean;
  big?: boolean;
}) {
  const suffix = suffixFor(value);
  return (
    <div
      className="p-7"
      style={{
        background: "rgba(255,255,255,0.62)",
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(2px)",
        border: big ? "2px solid #e8490f" : "1px solid #e2e8f0",
        borderRadius: 4,
      }}
    >
      <p className="label-eyebrow">{label}</p>
      {loading ? (
        <div
          className="mt-3"
          style={{ height: big ? 72 : 56, background: "#f0f4f9", width: "60%" }}
        />
      ) : (
        <p
          className="mt-3 font-bold tabular-nums"
          style={{
            fontSize: big ? 72 : 56,
            color: "#0a1628",
            letterSpacing: "-0.03em",
            lineHeight: 1,
          }}
        >
          {value}
          <span
            className="ml-1 align-baseline"
            style={{ fontSize: big ? 22 : 18, color: "#8a9bb0", fontWeight: 400 }}
          >
            {suffix} %ile
          </span>
        </p>
      )}
      <p className="mt-3 text-[12px] text-[#4a5d76] leading-[1.5]">
        {percentileNarrative(value)}
      </p>
    </div>
  );
}

function InsightCard({
  tone,
  title,
  body,
}: {
  tone: "positive" | "focus";
  title: string;
  body: string;
}) {
  const accent = tone === "positive" ? "#16a34a" : "#e8490f";
  return (
    <div
      className="p-5"
      style={{
        background: "rgba(255,255,255,0.62)",
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(2px)",
        borderLeft: `3px solid ${accent}`,
        border: "1px solid #e2e8f0",
        borderLeftWidth: 3,
        borderLeftColor: accent,
        borderRadius: 4,
      }}
    >
      <p
        className="text-[10px] uppercase font-bold"
        style={{ color: accent, letterSpacing: "0.12em" }}
      >
        {title}
      </p>
      <p className="mt-2 text-[14px] text-[#0a1628] leading-[1.55]">{body}</p>
    </div>
  );
}

function suffixFor(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return "th";
  switch (n % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

function percentileNarrative(n: number): string {
  if (n >= 90) return "Top decile. You're in the zone recruiters notice.";
  if (n >= 75) return "Top quartile. A consistent rep on harder cases will push you into the top 10%.";
  if (n >= 50) return "Above the median. Pick a target dimension and lift it.";
  if (n >= 25) return "Building. The next 10 attempts will move this fast.";
  if (n > 0) return "Just starting. Every attempt counts more than you'd think.";
  return "Submit your first attempt to land on the curve.";
}

function focusTipFor(d: { axis: string; value: number }, kind: AttemptType["kind"]): string {
  if (kind === "case") {
    const tips: Record<string, string> = {
      Framework: "Pick one named framework (Porter, MECE, profitability tree) and label it explicitly at the top of every answer.",
      Clarity:   "Number your sections. Front-load the recommendation. End with one-line summary.",
      Approach:  "Lead with a hypothesis. Show how the data either supports or breaks it.",
      Execution: "Add one quantified estimate per major claim. Vague numbers cost points.",
    };
    return `${d.axis} sits at ${d.value}/100. ${tips[d.axis] ?? "Pick this as your one repeatable improvement this week."}`;
  }
  const tips: Record<string, string> = {
    Methodology:  "State your approach in one sentence before any numbers. Top-down or bottom-up — pick and own it.",
    Accuracy:     "Sanity-check the final number against a different decomposition. Two paths should land in the same order of magnitude.",
    Reasoning:    "Show one assumption you flagged as a stretch — interviewers want to see the awareness, not perfection.",
    Presentation: "Use round numbers in your sub-steps. 50M not 47.3M. Cleaner steps = cleaner story.",
  };
  return `${d.axis} sits at ${d.value}/100. ${tips[d.axis] ?? "Pick this as your one repeatable improvement this week."}`;
}
