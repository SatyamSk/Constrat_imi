import { createFileRoute, useNavigate, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { getMyGlobalRank, getGlobalLeaderboard } from "@/lib/caseAnalysis";
import { getMySubscription, checkQuota, type SubscriptionInfo, type QuotaInfo } from "@/lib/billing";
import { getSitePulse, type SitePulse } from "@/lib/sitePulse";
import { Nav } from "@/components/Nav";
import {
  RadarChart, ScoreGraph, PercentileCard, InsightsPanel,
  CASE_AXES, GUESSTIMATE_AXES, SCORE_HISTORY,
} from "@/components/Analytics";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

interface UserStats {
  cases_solved: number;
  guesstimates_completed: number;
  total_score: number;
  current_streak: number;
}

interface NewsRow {
  id: string;
  title: string;
  source: string;
  topic: string;
  url: string;
  ai_summary: string;
  published_at: string;
}

interface DailyQ {
  type: string;
  question: string;
  difficulty: string;
}

interface LeaderRow {
  user_id: string;
  rank: number;
  display_name: string;
  total_score: number;
  current_streak: number;
}

function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState<string>("there");
  const [college, setCollege] = useState<string>("");
  const [stats, setStats] = useState<UserStats>({
    cases_solved: 0, guesstimates_completed: 0, total_score: 0, current_streak: 0,
  });
  const [rank, setRank] = useState<{ rank: number; total_score: number } | null>(null);
  const [news, setNews] = useState<NewsRow[]>([]);
  const [daily, setDaily] = useState<DailyQ | null>(null);
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [briefQ, setBriefQ] = useState<QuotaInfo | null>(null);
  const [photoQ, setPhotoQ] = useState<QuotaInfo | null>(null);
  const [pulse, setPulse] = useState<SitePulse | null>(null);
  const [leaders, setLeaders] = useState<LeaderRow[]>([]);
  const [activity, setActivity] = useState<Record<string, number>>({});
  const [totalUsers, setTotalUsers] = useState<number>(1);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login", replace: true });
      return;
    }
    loadAll(user.id);
  }, [user, authLoading, navigate]);

  async function loadAll(uid: string) {
    if (!isSupabaseConfigured || !supabase) return;
    const today = new Date().toISOString().slice(0, 10);

    const [
      { data: profile },
      { data: submissions },
      { data: newsData },
      { data: dailyData },
      rankData,
      subData,
      briefQuota,
      photoQuota,
      pulseData,
      leadersData,
      { data: activityData },
      { count: totalUsersCount },
    ] = await Promise.all([
      supabase.from("profiles").select("full_name, email, batch").eq("id", uid).maybeSingle(),
      // Compute stats from case_submissions directly (source of truth)
      supabase
        .from("case_submissions")
        .select("score, submitted_at")
        .eq("user_id", uid)
        .order("submitted_at", { ascending: false }),
      supabase.from("news")
        .select("id, title, source, topic, url, ai_summary, published_at")
        .order("published_at", { ascending: false })
        .limit(4),
      supabase.from("practice_questions")
        .select("type, question, difficulty")
        .eq("date_assigned", today)
        .maybeSingle(),
      getMyGlobalRank(uid),
      getMySubscription(uid),
      checkQuota(uid, "gd_brief"),
      checkQuota(uid, "photo_analysis"),
      getSitePulse(),
      getGlobalLeaderboard(8),
      // Activity heatmap data (last 35 days)
      supabase
        .from("case_submissions")
        .select("submitted_at")
        .eq("user_id", uid)
        .gte("submitted_at", new Date(Date.now() - 35 * 86400000).toISOString()),
      // Total users for percentile calculation
      supabase
        .from("global_leaderboard")
        .select("user_id", { count: "exact", head: true }),
    ]);

    setName(
      profile?.full_name?.trim() ||
        profile?.email?.split("@")[0] ||
        user?.email?.split("@")[0] || "there",
    );
    setCollege((profile as any)?.batch || "MBA Candidate");

    // Compute stats from actual submissions (source of truth)
    const allSubs = submissions || [];
    const totalScore = allSubs.reduce((sum: number, s: any) => sum + (s.score || 0), 0);
    const casesSolved = allSubs.length;
    // Streak: count consecutive days with submissions ending today
    let streak = 0;
    if (allSubs.length > 0) {
      const daySet = new Set(allSubs.map((s: any) => s.submitted_at?.slice(0, 10)));
      const d = new Date();
      while (daySet.has(d.toISOString().slice(0, 10))) {
        streak++;
        d.setDate(d.getDate() - 1);
      }
    }
    setStats({
      cases_solved: casesSolved,
      guesstimates_completed: 0,
      total_score: totalScore,
      current_streak: streak,
    });

    // Store total user count for percentile calculations
    setTotalUsers(totalUsersCount ?? 1);
    setNews((newsData as NewsRow[]) || []);
    setDaily(dailyData as DailyQ);
    setRank(rankData as any);
    setSub(subData);
    setBriefQ(briefQuota);
    setPhotoQ(photoQuota);
    setPulse(pulseData);
    setLeaders((leadersData as LeaderRow[]) || []);

    // Bucket activity by day
    const acts: Record<string, number> = {};
    (activityData || []).forEach((row: any) => {
      const d = row.submitted_at.slice(0, 10);
      acts[d] = (acts[d] || 0) + 1;
    });
    setActivity(acts);
  }

  const isPro = sub?.tier === "pro";

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#ffffff" }}>
      <Nav />

      {/* Streak banner — full-width orange strip */}
      <StreakBanner streak={stats.current_streak} />

      <div className="flex-1 flex">
        {/* LEFT SIDEBAR — DARK NAVY */}
        <DarkSidebar
          name={name}
          college={college}
          stats={stats}
          rank={rank?.rank ?? null}
          isPro={isPro}
        />

        {/* MAIN COLUMN */}
        <main className="flex-1 min-w-0 grid-bg">
          <div className="max-w-[760px] mx-auto px-6 py-8">
            {/* Metric strip */}
            <MetricStrip
              streak={stats.current_streak}
              cases={stats.cases_solved}
              rank={rank?.rank ?? null}
              score={stats.total_score}
            />

            {/* ANALYTICS HUB */}
            <section className="mt-8">
              <div className="flex items-baseline justify-between mb-5">
                <h2 className="text-[#0a1628] font-bold" style={{ fontSize: "16px", letterSpacing: "-0.015em" }}>
                  Performance Analytics
                </h2>
              </div>

              {/* Percentile strip */}
              <div className="flex gap-5 mb-6">
                <div className="flex-1 p-4" style={{ background: "rgba(255,255,255,0.62)", backdropFilter: "blur(2px)", border: "1px solid #e2e8f0", borderRadius: 6 }}>
                  <PercentileCard rank={rank?.rank ?? null} totalUsers={totalUsers} period="This Week" />
                </div>
                <div className="flex-1 p-4" style={{ background: "rgba(255,255,255,0.62)", backdropFilter: "blur(2px)", border: "1px solid #e2e8f0", borderRadius: 6 }}>
                  <PercentileCard rank={rank?.rank ?? null} totalUsers={totalUsers} period="This Month" />
                </div>
                <div className="flex-1 p-4" style={{ background: "rgba(255,255,255,0.62)", backdropFilter: "blur(2px)", border: "1px solid #e2e8f0", borderRadius: 6 }}>
                  <PercentileCard rank={rank?.rank ?? null} totalUsers={totalUsers} period="Overall" />
                </div>
              </div>

              {/* Radar charts side by side */}
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="p-5" style={{ background: "rgba(255,255,255,0.62)", backdropFilter: "blur(2px)", border: "1px solid #e2e8f0", borderRadius: 6 }}>
                  <RadarChart axes={CASE_AXES} accent="#E8490F" title="Case Solving" />
                </div>
                <div className="p-5" style={{ background: "rgba(255,255,255,0.62)", backdropFilter: "blur(2px)", border: "1px solid #e2e8f0", borderRadius: 6 }}>
                  <RadarChart axes={GUESSTIMATE_AXES} accent="#3B82F6" title="Guesstimates" />
                </div>
              </div>

              {/* Score progression */}
              <div className="p-5 mb-6" style={{ background: "rgba(255,255,255,0.62)", backdropFilter: "blur(2px)", border: "1px solid #e2e8f0", borderRadius: 6 }}>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[11px] uppercase tracking-[0.1em] font-bold text-[#8a9bb0]">
                    Score Progression · Last 20 submissions
                  </p>
                </div>
                <ScoreGraph data={SCORE_HISTORY} />
              </div>

              {/* Strengths & Focus */}
              <InsightsPanel caseAxes={CASE_AXES} guessAxes={GUESSTIMATE_AXES} />
            </section>

            {/* MARKET INTELLIGENCE / NEWS FEED */}
            <section className="mt-10">
              <div className="flex items-baseline justify-between">
                <h2 className="text-[#0a1628] font-bold" style={{ fontSize: "16px", letterSpacing: "-0.015em" }}>
                  Market Intelligence
                </h2>
                <Link to="/news" className="text-[11px] text-[#8a9bb0] hover:text-[#0a1628]">
                  Updated · view all →
                </Link>
              </div>

              <div className="mt-5">
                {news.length === 0 ? (
                  <p className="text-[13px] text-[#8a9bb0] py-8 text-center">
                    News will appear after the daily aggregator runs.
                  </p>
                ) : (
                  news.slice(0, 2).map((n) => <NewsRow key={n.id} item={n} />)
                )}
              </div>
            </section>
          </div>
        </main>

        {/* RIGHT PANEL — Rankings + Activity */}
        <RightPanel
          leaders={leaders}
          currentUserId={user?.id}
          activity={activity}
          pulse={pulse}
          briefQ={briefQ}
          photoQ={photoQ}
          isPro={isPro}
        />
      </div>
    </div>
  );
}

/* ============ STREAK BANNER ============ */
function StreakBanner({ streak }: { streak: number }) {
  return (
    <div
      className="h-9 px-5 md:px-6 flex items-center justify-between"
      style={{ background: "#e8490f" }}
    >
      <p className="text-white font-medium" style={{ fontSize: "13px", letterSpacing: "-0.005em" }}>
        🔥 Day {streak} streak — Keep it alive. Today's case drops at 06:00 IST.
      </p>
      <span className="text-white/80 font-mono tabular-nums" style={{ fontSize: "11px" }}>
        06:00 IST
      </span>
    </div>
  );
}

/* ============ LEFT SIDEBAR ============ */
function DarkSidebar({
  name,
  college,
  stats,
  rank,
  isPro,
}: {
  name: string;
  college: string;
  stats: UserStats;
  rank: number | null;
  isPro: boolean;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const items = [
    { label: "Today's Brief", to: "/dashboard" },
    { label: "Practice", to: "/practice" },
    { label: "Analytics", to: "/analytics" },
    { label: "News Feed", to: "/news" },
    { label: "Competitions", to: "/events" },
    { label: "Rankings", to: "/leaderboard" },
    { label: "Upgrade", to: "/upgrade" },
    { label: "Settings", to: "/account" },
  ];

  return (
    <aside
      className="hidden lg:flex flex-col w-[240px] shrink-0 grid-bg-dark"
      style={{ minHeight: "calc(100vh - 64px - 36px)" }}
    >
      <div className="p-7 flex-1">
        <nav className="space-y-1.5">
          {items.map((it) => {
            const active = path === it.to || (it.to !== "/dashboard" && path.startsWith(it.to));
            return (
              <Link
                key={it.label}
                to={it.to}
                className={`relative block py-2 pl-3 text-[14px] transition-colors ${
                  active
                    ? "text-white font-medium"
                    : "text-white/70 hover:text-white font-light"
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 bg-[#e8490f]" />
                )}
                {it.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User block */}
      <div
        className="p-7 pt-5"
        style={{ borderTop: "1px solid rgba(255,255,255,0.15)" }}
      >
        <p className="text-white font-medium" style={{ fontSize: "14px" }}>
          {name}
          {isPro && (
            <span className="ml-1.5 text-[#e8490f]" style={{ fontSize: "11px" }}>★ Pro</span>
          )}
        </p>
        <p className="text-[#e8490f] mt-0.5" style={{ fontSize: "11px" }}>
          {college}
        </p>
        <p className="text-white/40 font-light mt-2" style={{ fontSize: "10px" }}>
          Rank {rank ? `#${rank}` : "—"} · Streak {stats.current_streak} · Cases {stats.cases_solved} · Score{" "}
          {stats.total_score}
        </p>
      </div>
    </aside>
  );
}

/* ============ METRIC STRIP ============ */
function MetricStrip({
  streak,
  cases,
  rank,
  score,
}: {
  streak: number;
  cases: number;
  rank: number | null;
  score: number;
}) {
  const items = [
    { label: "Streak", value: streak.toString() },
    { label: "Cases Solved", value: cases.toString() },
    { label: "Peer Rank", value: rank ? `#${rank}` : "—" },
    { label: "Total Score", value: score.toString() },
  ];
  return (
    <div className="flex border-t-2 border-[#0a1628]">
      {items.map((m, i) => (
        <div
          key={m.label}
          className="flex-1 px-4 py-5"
          style={{
            borderRight: i < items.length - 1 ? "1px solid #e2e8f0" : "none",
          }}
        >
          <p
            className="text-[10px] uppercase font-semibold text-[#8a9bb0]"
            style={{ letterSpacing: "0.1em" }}
          >
            {m.label}
          </p>
          <p
            className="mt-2 font-bold text-[#0a1628] tabular-nums"
            style={{ fontSize: "32px", letterSpacing: "-0.025em", lineHeight: 1 }}
          >
            {m.value}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ============ FEATURED CASE ============ */
function FeaturedCase({ daily, navigate }: { daily: DailyQ | null; navigate: any }) {
  const [drop, setDrop] = useState("--:--:--");
  useEffect(() => {
    function tick() {
      const now = new Date();
      const target = new Date();
      target.setUTCHours(0, 30, 0, 0);
      if (target.getTime() <= now.getTime()) {
        target.setUTCDate(target.getUTCDate() + 1);
      }
      const diff = target.getTime() - now.getTime();
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      setDrop([h, m, s].map((n) => n.toString().padStart(2, "0")).join(":"));
    }
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, []);

  const question = daily?.question ||
    "A mid-sized pharma distributor has seen EBITDA drop from 18% to 11% over 18 months. Find the root cause.";
  const difficulty = daily?.difficulty || "Hard";
  const type = daily?.type || "Profitability";

  return (
    <section className="mt-8">
      <div className="flex items-center gap-2">
        <span className="inline-block w-2 h-2 bg-[#e8490f] rounded-full" />
        <span className="text-[10px] uppercase tracking-[0.1em] font-bold text-[#e8490f]">
          DROPS IN {drop} · {type} · {difficulty}
        </span>
      </div>
      <h1
        className="mt-3 font-bold text-[#0a1628]"
        style={{ fontSize: "24px", letterSpacing: "-0.02em", lineHeight: 1.25 }}
      >
        {question}
      </h1>
      <p
        className="mt-3 text-[#8a9bb0] font-light"
        style={{ fontSize: "11px" }}
      >
        Est. 25 min · {difficulty} · Be the first to solve
      </p>

      <button
        onClick={() => {
          if (daily?.question) {
            sessionStorage.setItem("constrat:prefill_prompt", daily.question);
          }
          navigate({ to: "/submit-case" });
        }}
        className="mt-5 w-full bg-[#0a1628] text-white py-3.5 flex items-center justify-between px-5 hover:bg-[#162236] transition-colors"
      >
        <span className="font-medium" style={{ fontSize: "14px" }}>
          Open Case When Live
        </span>
        <span className="font-mono tabular-nums text-[#e8490f]" style={{ fontSize: "13px" }}>
          {drop}
        </span>
      </button>
    </section>
  );
}

/* ============ NEWS ROW ============ */
function NewsRow({ item }: { item: NewsRow }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block py-4 group"
      style={{ borderBottom: "1px solid #e2e8f0" }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h4
            className="font-bold text-[#0a1628] group-hover:text-[#e8490f] transition-colors"
            style={{ fontSize: "15px", letterSpacing: "-0.01em", lineHeight: 1.35 }}
          >
            {item.title}
          </h4>
          {item.ai_summary && (
            <p
              className="mt-1.5 text-[#4a5d76] font-light line-clamp-2"
              style={{ fontSize: "13px", lineHeight: 1.5 }}
            >
              {item.ai_summary}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className="pill pill-navy text-[10px]">{item.source}</span>
            {item.topic && <span className="pill text-[10px]">{item.topic}</span>}
          </div>
        </div>
        <span className="text-[10px] text-[#8a9bb0] font-light shrink-0 tabular-nums">
          {timeAgo(item.published_at)}
        </span>
      </div>
    </a>
  );
}

/* ============ RIGHT PANEL ============ */
function RightPanel({
  leaders,
  currentUserId,
  activity,
  pulse,
  briefQ,
  photoQ,
  isPro,
}: {
  leaders: LeaderRow[];
  currentUserId?: string;
  activity: Record<string, number>;
  pulse: SitePulse | null;
  briefQ: QuotaInfo | null;
  photoQ: QuotaInfo | null;
  isPro: boolean;
}) {
  return (
    <aside
      className="hidden xl:flex flex-col w-[260px] shrink-0 grid-bg"
      style={{ borderLeft: "1px solid #e2e8f0" }}
    >
      <div className="p-6 space-y-7">
        {/* Live pulse */}
        <div>
          <p className="label-eyebrow flex items-center gap-2">
            <span className="pulse-dot" /> LIVE NOW
          </p>
          <p className="mt-2 text-[20px] font-bold text-[#0a1628] tabular-nums">
            {(pulse?.solving_right_now ?? 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-[#8a9bb0] font-light mt-1">
            users solving cases
          </p>
        </div>

        {/* Quotas */}
        {(briefQ || photoQ) && (
          <div>
            <p className="label-eyebrow">QUOTAS · TODAY</p>
            <div className="mt-3 space-y-3">
              {briefQ && (
                <QuotaBar
                  label="GD briefs"
                  used={briefQ.used}
                  limit={briefQ.limit}
                  isPro={isPro}
                />
              )}
              {photoQ && (
                <QuotaBar
                  label="Photo analyses"
                  used={photoQ.used}
                  limit={photoQ.limit}
                  isPro={isPro}
                />
              )}
            </div>
            {!isPro && (
              <Link
                to="/upgrade"
                className="mt-3 inline-block text-[11px] font-semibold text-[#e8490f] hover:underline"
              >
                Upgrade for more →
              </Link>
            )}
          </div>
        )}

        {/* Live Rankings */}
        <div>
          <div className="flex items-baseline justify-between">
            <p className="label-eyebrow">LIVE RANKINGS</p>
            <span className="text-[10px] text-[#8a9bb0]">This week</span>
          </div>
          <div className="mt-3">
            {leaders.length === 0 ? (
              <p className="text-[11px] text-[#8a9bb0] py-2">
                Loading rankings…
              </p>
            ) : (
              leaders.map((l) => (
                <LeaderRow
                  key={l.user_id}
                  row={l}
                  highlight={l.user_id === currentUserId}
                />
              ))
            )}
          </div>
        </div>

        {/* Activity heatmap */}
        <div>
          <p className="label-eyebrow">ACTIVITY · 35 DAYS</p>
          <ActivityHeatmap activity={activity} />
        </div>
      </div>
    </aside>
  );
}

function QuotaBar({
  label,
  used,
  limit,
  isPro,
}: {
  label: string;
  used: number;
  limit: number;
  isPro: boolean;
}) {
  const shownLimit = isPro && limit >= 1000 ? "∞" : limit.toString();
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const danger = pct >= 80 && !(isPro && limit >= 1000);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-[#0a1628] font-medium">{label}</span>
        <span
          className="text-[10px] font-mono tabular-nums"
          style={{ color: danger ? "#dc2626" : "#8a9bb0" }}
        >
          {used} / {shownLimit}
        </span>
      </div>
      <div className="h-1 bg-[#e2e8f0]">
        <div
          className="h-full transition-all"
          style={{
            width: `${isPro && limit >= 1000 ? Math.min(20, (used / 25) * 100) : pct}%`,
            background: danger ? "#dc2626" : "#e8490f",
          }}
        />
      </div>
    </div>
  );
}

function LeaderRow({
  row,
  highlight,
}: {
  row: LeaderRow;
  highlight: boolean;
}) {
  return (
    <div
      className="flex items-center gap-2.5 py-1.5 px-2 -mx-2"
      style={{
        background: highlight ? "#fdf0eb" : "transparent",
      }}
    >
      <span
        className="font-bold text-[#0a1628] tabular-nums w-5 text-right"
        style={{ fontSize: "13px" }}
      >
        {row.rank}
      </span>
      <span
        className="w-6 h-6 rounded-full flex items-center justify-center font-semibold"
        style={{ background: "#fdf0eb", color: "#c03a08", fontSize: "9px" }}
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
          className="text-[#0a1628] truncate"
          style={{ fontSize: "11px", fontWeight: highlight ? 600 : 500 }}
        >
          {row.display_name}
          {highlight && (
            <span className="ml-1 text-[#e8490f]" style={{ fontSize: "9px" }}>
              (you)
            </span>
          )}
        </p>
      </div>
      <span
        className="font-bold text-[#e8490f] tabular-nums"
        style={{ fontSize: "11px" }}
      >
        {row.total_score}
      </span>
    </div>
  );
}

function ActivityHeatmap({ activity }: { activity: Record<string, number> }) {
  // 7 days x 5 weeks
  const today = new Date();
  const days: { iso: string; count: number }[] = [];
  for (let i = 34; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    days.push({ iso, count: activity[iso] || 0 });
  }
  return (
    <div className="mt-3">
      <div className="grid grid-cols-7 gap-[3px]">
        {days.map((d) => (
          <div
            key={d.iso}
            className="aspect-square"
            title={`${d.iso}: ${d.count} submission${d.count === 1 ? "" : "s"}`}
            style={{
              background: d.count === 0 ? "transparent" : intensityColor(d.count),
              border: d.count === 0 ? "1px solid #e2e8f0" : "none",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function intensityColor(n: number): string {
  if (n >= 4) return "#e8490f";
  if (n >= 3) return "#f06b35";
  if (n >= 2) return "#f59e7d";
  return "#fdf0eb";
}

function timeAgo(iso: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}
