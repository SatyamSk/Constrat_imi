import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Footer as _Footer } from "@/components/Footer";
import { LiveTicker } from "@/components/LiveTicker";
import { useAuth } from "@/lib/auth";
import { getSitePulse, type SitePulse } from "@/lib/sitePulse";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/")({ component: Home });

interface CompanyProfile {
  name: string;
  sector: string;
  style: string;
}

const COMPANIES: CompanyProfile[] = [
  { name: "McKinsey",        sector: "Consulting",  style: "Hypothesis-driven case format, heavy on structured problem-solving and quantitative rigor." },
  { name: "BCG",             sector: "Consulting",  style: "Conversational case interviews, focus on creative frameworks and business judgement." },
  { name: "Bain",            sector: "Consulting",  style: "Profitability + market-entry cases, expect strong attention to client mindset." },
  { name: "Goldman Sachs",   sector: "Investment Banking", style: "Technical finance grilling, valuation, deal modelling, behaviourals with VPs." },
  { name: "Kearney",         sector: "Strategy",    style: "Operations and supply-chain cases. Pen-and-paper math under time pressure." },
  { name: "Amazon",          sector: "Tech / Product", style: "Leadership Principles + product-sense case, customer obsession is non-negotiable." },
];

function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pulse, setPulse] = useState<SitePulse | null>(null);
  const [featured, setFeatured] = useState<{ title: string; type: string; difficulty: string } | null>(null);

  // If user is logged in, send them straight to dashboard
  useEffect(() => {
    if (user) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    getSitePulse().then(setPulse);
    if (!supabase) return;
    const today = new Date().toISOString().slice(0, 10);
    supabase
      .from("practice_questions")
      .select("type, question, difficulty")
      .eq("date_assigned", today)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setFeatured({
            title: data.question,
            type: data.type,
            difficulty: data.difficulty || "Medium",
          });
        }
      });
  }, []);

  return (
    <PageShell>
      {/* ============ HERO ============ */}
      <section className="grid-bg">
        <div className="mx-auto max-w-[1280px] px-5 md:px-6 grid lg:grid-cols-[1fr_1.05fr] gap-0 lg:gap-12 pt-12 lg:pt-20 pb-20 lg:pb-24">
          {/* LEFT */}
          <div className="flex flex-col justify-center">
            <span className="label-orange">
              The Operating System for MBA Placement
            </span>
            <h1
              className="mt-6 font-bold leading-[1.02] text-[#0a1628]"
              style={{ fontSize: "clamp(36px, 6vw, 56px)", letterSpacing: "-0.03em" }}
            >
              <span className="font-light">Every placement</span><br />
              <span className="font-bold">decision starts</span><br />
              <span className="brand-italic">the night before.</span>
            </h1>
            <p
              className="mt-6 max-w-[440px] text-[#4a5d76] font-light leading-[1.7]"
              style={{ fontSize: "16px" }}
            >
              Daily cases, guesstimate practice, company intelligence, and live
              rankings — built for MBA candidates who are serious about where
              they land.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <Link to="/join" className="btn-primary h-12 px-6 text-[14px]">
                Start Preparing — It's Free
              </Link>
              <Link to="/login" className="btn-ghost text-[14px] font-semibold">
                See How It Works →
              </Link>
            </div>
          </div>

          {/* RIGHT — DARK NAVY LIVE CASE PANEL */}
          <LiveCasePanel featured={featured} pulse={pulse} />
        </div>
      </section>

      {/* ============ LIVE TICKER ============ */}
      <LiveTicker dark />

      {/* ============ STATS STRIP ============ */}
      <section className="grid-bg-dark">
        <div className="mx-auto max-w-[1280px] px-5 md:px-6 h-16 flex items-stretch">
          <Stat number={pulse?.cases_solved_total ?? 2847} label="Cases Solved" />
          <StatDivider />
          <Stat number={pulse?.active_streaks ?? 312} label="Active Streaks" />
          <StatDivider />
          <Stat number={28} label="Companies Tracked" />
          <StatDivider />
          <Stat number={47} label="Interview Experiences" />
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="grid-bg">
        <div className="mx-auto max-w-[1280px] px-5 md:px-6 py-20">
          <span className="label-orange">How It Works</span>
          <h2
            className="mt-5 font-bold text-[#0a1628] max-w-[720px]"
            style={{ fontSize: "clamp(28px, 4vw, 36px)", letterSpacing: "-0.025em", lineHeight: 1.1 }}
          >
            Four steps. Repeatable daily.
          </h2>

          <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-4 gap-0 border border-[#e2e8f0]">
            <Step n="01" title="Open the daily brief" body="Today's case, news ticker, and your live rank are pre-loaded for you every morning at 06:00 IST." />
            <Step n="02" title="Solve in 25 min" body="Build your framework directly on the grid workspace. Timer, benchmarks, structure checklist on the side." last={false} />
            <Step n="03" title="Get an AI score" body="GPT-4o Vision scores your structure on framework, clarity, approach, execution. 0-100 in seconds." last={false} />
            <Step n="04" title="See where you rank" body="Per-case + global leaderboards. Tagged by B-school. Recruiters cold-mail people in the top 50." last />
          </div>
        </div>
      </section>

      {/* ============ COMPANY INTEL ============ */}
      <section className="grid-bg">
        <div className="mx-auto max-w-[1280px] px-5 md:px-6 py-20">
          <span className="label-orange">Company Intelligence</span>
          <h2
            className="mt-5 font-bold text-[#0a1628] max-w-[820px]"
            style={{ fontSize: "clamp(28px, 4vw, 36px)", letterSpacing: "-0.025em", lineHeight: 1.1 }}
          >
            Know what they want before you walk in.
          </h2>

          <div className="mt-12 grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-0 border border-[#e2e8f0]">
            {COMPANIES.map((c, i) => (
              <CompanyCard
                key={c.name}
                c={c}
                borderRight={i % 3 !== 2}
                borderBottom={i < 3}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="grid-bg-dark relative overflow-hidden">
        <div className="mx-auto max-w-[1280px] px-5 md:px-6 py-24 text-center">
          <span
            className="inline-block text-[10px] uppercase tracking-[0.12em] font-bold"
            style={{ color: "#e8490f" }}
          >
            <span className="inline-block w-1 h-3 bg-[#e8490f] mr-2 align-middle" />
            Built for serious candidates
          </span>
          <h2
            className="mt-6 font-bold text-white max-w-[820px] mx-auto"
            style={{ fontSize: "clamp(32px, 5vw, 48px)", letterSpacing: "-0.025em", lineHeight: 1.05 }}
          >
            Stop hoping you'll get the job.<br />
            <span style={{ color: "#e8490f" }}>Engineer the outcome.</span>
          </h2>
          <p className="mt-6 text-[#8a9bb0] font-light max-w-[560px] mx-auto leading-[1.65]" style={{ fontSize: "16px" }}>
            ₹99/month — less than your last chai run. Daily reps, AI scoring, live
            leaderboards. Built by a student. Priced like one.
          </p>
          <div className="mt-10">
            <Link to="/join" className="btn-primary h-12 px-8 text-[14px]">
              Start Preparing — It's Free
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

/* ============ LIVE CASE PANEL ============ */
function LiveCasePanel({
  featured,
  pulse,
}: {
  featured: { title: string; type: string; difficulty: string } | null;
  pulse: SitePulse | null;
}) {
  const [countdown, setCountdown] = useState<string>("--:--:--");

  // Counts down to next 06:00 IST (= 00:30 UTC)
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
      setCountdown(
        [h, m, s]
          .map((n) => n.toString().padStart(2, "0"))
          .join(":"),
      );
    }
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, []);

  const caseTitle = featured?.title ||
    "A leading Indian FMCG company is considering entering the premium pet food market. Should they?";
  const caseType = featured?.type || "Market Entry";

  return (
    <div
      className="relative overflow-hidden p-7 lg:p-8 flex flex-col mt-10 lg:mt-0 grid-bg-dark"
      style={{ minHeight: "520px" }}
    >
      {/* Top: three live pills */}
      <div className="flex flex-wrap gap-2">
        <LivePill icon="dot">
          {(pulse?.solving_right_now ?? 1247).toLocaleString()} solving right now
        </LivePill>
        <LivePill>{(pulse?.cases_in_bank ?? 2847).toLocaleString()} cases in the bank</LivePill>
        <LivePill>{(pulse?.active_streaks ?? 312)} active streaks today</LivePill>
      </div>

      {/* Case tag */}
      <div className="mt-7 flex items-center gap-2">
        <span className="inline-block w-2 h-2 bg-[#e8490f] rounded-full" />
        <span className="text-[10px] uppercase tracking-[0.12em] font-bold text-[#e8490f]">
          Live Now · {caseType} · {featured?.difficulty || "Hard"}
        </span>
      </div>

      {/* Question */}
      <p
        className="mt-3 text-white font-medium leading-[1.45]"
        style={{ fontSize: "17px" }}
      >
        {caseTitle}
      </p>

      {/* Divider */}
      <div className="my-6 h-px bg-white/10" />

      {/* Mini framework grid — purely visual, shows a student mid-solve */}
      <div className="grid grid-cols-2 gap-px bg-white/10">
        <FrameworkCell label="Market Definition" content="Premium = >₹500/kg packaged pet food" />
        <FrameworkCell label="Segmentation" content="Dog vs cat · Tier-1 vs Tier-2 · Veg vs non-veg" />
        <FrameworkCell label="Sizing Logic" content="Pet HHs × adoption × spend/yr" cursor />
        <FrameworkCell label="Key Assumption" content="3.5% of urban HHs own a premium-eligible pet" />
      </div>

      {/* Bottom data strip */}
      <div className="mt-auto pt-6 flex items-end justify-between gap-3">
        <p className="text-white/50 font-light leading-[1.5]" style={{ fontSize: "10px" }}>
          Avg solve time 23 min · Top score 94 · Attempts today 847
        </p>
        <p
          className="text-[#e8490f] font-bold tabular-nums"
          style={{ fontSize: "11px", letterSpacing: "0.02em" }}
        >
          DROPS IN {countdown}
        </p>
      </div>
    </div>
  );
}

function LivePill({ children, icon }: { children: React.ReactNode; icon?: "dot" }) {
  return (
    <span
      className="inline-flex items-center gap-2 px-3 py-1.5 text-[11px] text-white/85 font-light"
      style={{ background: "#162236", letterSpacing: "-0.005em" }}
    >
      {icon === "dot" && <span className="pulse-dot" />}
      {children}
    </span>
  );
}

function FrameworkCell({
  label,
  content,
  cursor = false,
}: {
  label: string;
  content: string;
  cursor?: boolean;
}) {
  return (
    <div className="bg-[#0a1628] p-3" style={{ minHeight: "80px" }}>
      <p
        className="text-[9px] uppercase font-bold tracking-[0.12em] text-white/40"
        style={{ letterSpacing: "0.12em" }}
      >
        {label}
      </p>
      <p className="mt-2 text-[11px] text-white/85 font-light leading-[1.45]">
        {content}
        {cursor && (
          <span
            className="inline-block w-[1px] h-3 bg-[#e8490f] ml-1 align-middle"
            style={{ animation: "fadeIn 1s ease-in-out infinite alternate" }}
          />
        )}
      </p>
    </div>
  );
}

/* ============ STATS BAR ============ */
function Stat({ number, label }: { number: number; label: string }) {
  return (
    <div className="flex-1 flex flex-col items-start justify-center px-4 md:px-6">
      <p className="text-white font-bold tabular-nums" style={{ fontSize: "20px" }}>
        {number.toLocaleString()}
      </p>
      <p
        className="text-white/60 font-light uppercase mt-0.5"
        style={{ fontSize: "9px", letterSpacing: "0.12em" }}
      >
        {label}
      </p>
    </div>
  );
}
function StatDivider() {
  return <div className="self-stretch w-px bg-white/15" />;
}

/* ============ HOW IT WORKS STEP ============ */
function Step({
  n,
  title,
  body,
  last,
}: {
  n: string;
  title: string;
  body: string;
  last?: boolean;
}) {
  return (
    <div
      className="bg-white p-7"
      style={{
        borderRight: last ? "none" : "1px solid #e2e8f0",
        borderBottom: "1px solid #e2e8f0",
      }}
    >
      <p
        className="text-[10px] font-bold tabular-nums text-[#e8490f]"
        style={{ letterSpacing: "0.08em" }}
      >
        {n}
      </p>
      <h3
        className="mt-4 font-bold text-[#0a1628]"
        style={{ fontSize: "18px", letterSpacing: "-0.015em", lineHeight: 1.3 }}
      >
        {title}
      </h3>
      <p className="mt-3 text-[#4a5d76] font-light leading-[1.6]" style={{ fontSize: "14px" }}>
        {body}
      </p>
    </div>
  );
}

/* ============ COMPANY CARD ============ */
function CompanyCard({
  c,
  borderRight,
  borderBottom,
}: {
  c: CompanyProfile;
  borderRight: boolean;
  borderBottom: boolean;
}) {
  return (
    <div
      className="bg-white p-6 transition-colors hover:bg-[#fafcfe]"
      style={{
        borderRight: borderRight ? "1px solid #e2e8f0" : "none",
        borderBottom: borderBottom ? "1px solid #e2e8f0" : "none",
      }}
    >
      <p
        className="font-bold text-[#0a1628]"
        style={{ fontSize: "15px", letterSpacing: "-0.01em" }}
      >
        {c.name}
      </p>
      <p
        className="text-[#8a9bb0] font-light mt-0.5"
        style={{ fontSize: "11px" }}
      >
        {c.sector}
      </p>
      <p
        className="mt-4 text-[#4a5d76] font-light leading-[1.55]"
        style={{ fontSize: "13px" }}
      >
        {c.style}
      </p>
      <p
        className="mt-5 font-semibold text-[#e8490f] cursor-pointer hover:text-[#c03a08]"
        style={{ fontSize: "13px" }}
      >
        View Profile →
      </p>
    </div>
  );
}
