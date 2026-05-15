import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { getMyGlobalRank } from "@/lib/caseAnalysis";
import { getMySubscription, checkQuota, type SubscriptionInfo, type QuotaInfo } from "@/lib/billing";
import { PageShell, PageHeader } from "@/components/PageShell";
import { GlowCard } from "@/components/GlowCard";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

interface UserStats {
  cases_solved: number;
  guesstimates_completed: number;
  total_score: number;
  current_streak: number;
}

interface RecentSubmission {
  id: string;
  title: string;
  score: number;
  submitted_at: string;
}

interface DailyQuestion {
  type: string;
  question: string;
  difficulty: string;
}

function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState<string>("there");
  const [stats, setStats] = useState<UserStats>({
    cases_solved: 0,
    guesstimates_completed: 0,
    total_score: 0,
    current_streak: 0,
  });
  const [rank, setRank] = useState<{ rank: number; total_score: number } | null>(null);
  const [recent, setRecent] = useState<RecentSubmission[]>([]);
  const [daily, setDaily] = useState<DailyQuestion | null>(null);
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [briefQuota, setBriefQuota] = useState<QuotaInfo | null>(null);
  const [photoQuota, setPhotoQuota] = useState<QuotaInfo | null>(null);

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
      { data: statsData },
      { data: recentData },
      { data: dailyData },
      rankData,
      subData,
      briefQ,
      photoQ,
    ] = await Promise.all([
      supabase.from("profiles").select("full_name, email").eq("id", uid).maybeSingle(),
      supabase.from("user_statistics").select("*").eq("user_id", uid).maybeSingle(),
      supabase
        .from("case_submissions")
        .select("id, title, score, submitted_at")
        .eq("user_id", uid)
        .order("submitted_at", { ascending: false })
        .limit(5),
      supabase
        .from("practice_questions")
        .select("type, question, difficulty")
        .eq("date_assigned", today)
        .maybeSingle(),
      getMyGlobalRank(uid),
      getMySubscription(uid),
      checkQuota(uid, "gd_brief"),
      checkQuota(uid, "photo_analysis"),
    ]);

    setName(
      profile?.full_name?.trim() ||
        (profile?.email?.split("@")[0]) ||
        (user?.email?.split("@")[0]) ||
        "there",
    );
    if (statsData) {
      setStats({
        cases_solved: statsData.cases_solved ?? 0,
        guesstimates_completed: statsData.guesstimates_completed ?? 0,
        total_score: statsData.total_score ?? 0,
        current_streak: statsData.current_streak ?? 0,
      });
    }
    if (recentData) setRecent(recentData as RecentSubmission[]);
    if (dailyData) setDaily(dailyData as DailyQuestion);
    if (rankData) setRank(rankData as any);
    setSub(subData);
    setBriefQuota(briefQ);
    setPhotoQuota(photoQ);
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow={greeting()}
        title={`Welcome back, ${name.split(" ")[0]}.`}
        subtitle="Your case-prep command centre."
      />

      <div className="mx-auto max-w-[1180px] px-5 md:px-6 -mt-2 pb-20">
        {/* Top row: rank + daily case CTA */}
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-5">
          {/* Rank card */}
          <GlowCard className="p-6">
            <div className="relative z-10">
              <p className="label-eyebrow">Your Global Rank</p>
              <div className="mt-3 flex items-end gap-3">
                <p
                  className="font-serif text-[56px] leading-none"
                  style={{ color: "#E8490F" }}
                >
                  {rank?.rank ? `#${rank.rank}` : "—"}
                </p>
                <p className="text-[13px] text-text-muted pb-2">
                  {rank?.total_score ?? 0} points
                </p>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                <Stat label="Cases" value={stats.cases_solved} />
                <Stat label="Guess." value={stats.guesstimates_completed} />
                <Stat label="Streak" value={`${stats.current_streak}d`} />
              </div>
              <Link
                to="/leaderboard"
                className="mt-4 inline-block text-[12px] text-orange hover:underline"
              >
                Full leaderboard →
              </Link>
            </div>
          </GlowCard>

          {/* Daily case */}
          <GlowCard
            className="p-6"
            style={{ background: "#FFF0EB", borderColor: "#E8C4B0" }}
          >
            <div className="relative z-10">
              <span className="label-orange">
                Today's {daily?.type ? daily.type.toLowerCase() : "Question"}
              </span>
              <h3 className="mt-3 font-serif text-[24px] leading-[1.25]">
                {daily?.question ??
                  "No daily question yet. The AI cron generates one each night."}
              </h3>
              <div className="mt-4 flex gap-2">
                {daily?.difficulty && (
                  <span className="pill pill-orange">{daily.difficulty}</span>
                )}
                <span className="pill">AI Generated</span>
              </div>
              <button
                onClick={() => {
                  if (daily?.question) {
                    sessionStorage.setItem("constrat:prefill_prompt", daily.question);
                  }
                  navigate({ to: "/submit-case" });
                }}
                className="btn-primary mt-5"
              >
                Attempt now →
              </button>
            </div>
          </GlowCard>
        </div>

        {/* Quota strip */}
        {sub && (
          <div className="mt-6 grid md:grid-cols-3 gap-4">
            <PlanBadge sub={sub} />
            {briefQuota && (
              <QuotaCard
                label="GD briefs today"
                used={briefQuota.used}
                limit={briefQuota.limit}
                tier={briefQuota.tier}
              />
            )}
            {photoQuota && (
              <QuotaCard
                label="Photo analyses today"
                used={photoQuota.used}
                limit={photoQuota.limit}
                tier={photoQuota.tier}
              />
            )}
          </div>
        )}

        {/* Quick actions */}
        <div className="mt-8 grid md:grid-cols-4 gap-3">
          <ActionTile to="/practice" title="Practice" desc="Daily Q + case library" />
          <ActionTile to="/submit-case" title="Submit case" desc="Get AI score" />
          <ActionTile to="/news" title="News brief" desc="Macro + micro angles" />
          <ActionTile to="/events" title="Competitions" desc="Upcoming deadlines" />
        </div>

        {/* Recent activity */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[18px] font-semibold">Recent submissions</h2>
            <Link
              to="/account"
              className="text-[12px] text-orange hover:underline"
            >
              All submissions →
            </Link>
          </div>
          {recent.length === 0 ? (
            <GlowCard className="p-8 text-center">
              <p className="text-[14px] text-text-muted">
                You haven't submitted a case yet. Start with today's question above.
              </p>
            </GlowCard>
          ) : (
            <div className="space-y-2">
              {recent.map((r) => (
                <GlowCard
                  key={r.id}
                  className="p-4 flex items-center justify-between gap-3"
                >
                  <div className="relative z-10 min-w-0">
                    <p className="text-[14px] font-semibold truncate">
                      {r.title}
                    </p>
                    <p className="text-[11px] text-text-muted">
                      {new Date(r.submitted_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="relative z-10 text-right shrink-0">
                    <p
                      className="text-[20px] font-bold"
                      style={{ color: "#E8490F" }}
                    >
                      {r.score}
                    </p>
                    <p className="text-[10px] text-text-muted">/ 100</p>
                  </div>
                </GlowCard>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Late night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-[16px] font-bold">{value}</p>
      <p className="text-[10px] uppercase tracking-[0.06em] text-text-muted">
        {label}
      </p>
    </div>
  );
}

function PlanBadge({ sub }: { sub: SubscriptionInfo }) {
  const isPro = sub.tier === "pro";
  return (
    <div
      className="rounded-[12px] border p-4"
      style={{
        background: isPro ? "#F0FDF4" : "#FFFFFF",
        borderColor: isPro ? "#86EFAC" : "#E8E4DE",
      }}
    >
      <p className="text-[11px] uppercase tracking-[0.08em] font-bold text-text-muted">
        Plan
      </p>
      <p
        className="mt-1 text-[18px] font-semibold"
        style={{ color: isPro ? "#15803D" : "#3F3F3F" }}
      >
        {isPro ? "Constrat Pro ✦" : "Free"}
      </p>
      {!isPro && (
        <Link
          to="/payment"
          className="mt-2 inline-block text-[12px] text-orange font-semibold hover:underline"
        >
          Upgrade for ₹99/mo →
        </Link>
      )}
    </div>
  );
}

function QuotaCard({
  label,
  used,
  limit,
  tier,
}: {
  label: string;
  used: number;
  limit: number;
  tier: string;
}) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const danger = pct >= 80;
  return (
    <div className="rounded-[12px] border border-border bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.08em] font-bold text-text-muted">
          {label}
        </p>
        <p
          className="text-[12px] font-mono"
          style={{ color: danger ? "#DC2626" : "#3F3F3F" }}
        >
          {used} / {tier === "pro" && limit >= 1000 ? "∞" : limit}
        </p>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: danger ? "#DC2626" : "#E8490F",
          }}
        />
      </div>
    </div>
  );
}

function ActionTile({
  to,
  title,
  desc,
}: {
  to: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      to={to}
      className="card-base p-4 hover:border-orange hover:scale-[1.01] transition-all"
    >
      <p className="text-[14px] font-semibold">{title}</p>
      <p className="text-[11px] text-text-muted mt-1">{desc}</p>
    </Link>
  );
}
