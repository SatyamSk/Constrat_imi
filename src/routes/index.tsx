import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { AnimatedSection } from "@/components/AnimatedSection";
import { GlowCard } from "@/components/GlowCard";
import { useState, useEffect, useRef } from "react";

export const Route = createFileRoute("/")({ component: Home });

function useCountUp(target: number, duration = 2000) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      const start = performance.now();
      const step = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        setVal(Math.round(p * target));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target, duration]);
  return { val, ref };
}

function Home() {
  return (
    <PageShell>
      <Hero />
      <StatsBar />
      <Features />
      <CasePreview />
      <HowItWorks />
      <CompanyIntel />
      <SocialProof />
      <CollegeNetwork />
      <FinalCTA />
    </PageShell>
  );
}

/* ── HERO ── */
function Hero() {
  return (
    <section className="relative overflow-hidden" style={{ background: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(232,73,15,0.08), transparent), radial-gradient(ellipse 60% 40% at 100% 0%, rgba(232,73,15,0.05), transparent), #FAFAF8" }}>
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
      <div className="mx-auto max-w-[1180px] px-5 md:px-6 pt-32 md:pt-[160px] pb-20 md:pb-28 relative z-10">
        <div className="max-w-[720px] slide-up">
          <h1 className="font-serif text-[44px] sm:text-[56px] md:text-[72px] leading-[1.2] tracking-[-0.01em] text-text-primary">
            The operating system for MBA placement.
          </h1>
          <p className="mt-6 text-[17px] md:text-[19px] text-text-secondary leading-[1.65] max-w-[560px]" style={{ fontFamily: "var(--font-sans)" }}>
            Daily cases, guesstimates, company intel, and interview prep — built for students who are serious about where they land.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/join" className="btn-primary text-[15px] h-[52px] px-7">Start Preparing — It's Free</Link>
            <a href="#how-it-works" className="btn-secondary text-[15px] h-[52px] px-7">See How It Works</a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── STATS BAR ── */
function StatsBar() {
  const s1 = useCountUp(2847);
  const s2 = useCountUp(312);
  const s3 = useCountUp(28);
  const s4 = useCountUp(47);
  const stats = [
    { ...s1, label: "Cases Solved This Week", suffix: "" },
    { ...s2, label: "Active Streak Users", suffix: "" },
    { ...s3, label: "Companies Tracked", suffix: "" },
    { ...s4, label: "Interview Experiences", suffix: "" },
  ];
  return (
    <section style={{ background: "#130F0A" }}>
      <div className="mx-auto max-w-[1180px] px-5 md:px-6 py-6 md:py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <div key={i} ref={s.ref} className="text-center">
            <p className="text-[32px] md:text-[40px] font-bold leading-none" style={{ fontFamily: "var(--font-mono)", color: "#E8490F" }}>
              {s.val.toLocaleString()}{s.suffix}
            </p>
            <p className="mt-1 text-[12px] uppercase tracking-[0.1em] font-medium" style={{ fontFamily: "var(--font-sans)", color: "#888" }}>{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── FEATURES ── */
function Features() {
  const cols = [
    { title: "Daily Practice Loop", desc: "A new case and guesstimate every morning. Timed. Framework-guided. AI-evaluated. Build your streak or fall behind.", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
    { title: "Placement Intelligence", desc: "Company profiles, interview experiences, insider data on what each firm asks and what they look for. Know before you walk in.", icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
    { title: "IMI-Specific Layer", desc: "Live timetable sync, batch leaderboard, Telegram alerts for schedule changes, placement deadlines, and club events.", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
  ];
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-[1180px] px-5 md:px-6 py-20 md:py-28">
        <div className="grid md:grid-cols-3 gap-8">
          {cols.map((c, i) => (
            <AnimatedSection key={i} delay={i * 100}>
              <div className="p-6">
                <div className="w-11 h-11 rounded-lg flex items-center justify-center" style={{ background: "#FFF0EB" }}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#E8490F" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d={c.icon} /></svg>
                </div>
                <h3 className="mt-5 text-[20px] font-semibold tracking-[-0.01em]" style={{ fontFamily: "var(--font-sans)" }}>{c.title}</h3>
                <p className="mt-3 text-[14px] text-text-secondary leading-[1.65]">{c.desc}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── CASE PREVIEW (FOMO) ── */
function CasePreview() {
  const [h, setH] = useState(23);
  const [m, setM] = useState(47);
  useEffect(() => {
    const t = setInterval(() => setM(p => { if (p <= 0) { setH(q => Math.max(q - 1, 0)); return 59; } return p - 1; }), 60000);
    return () => clearInterval(t);
  }, []);
  return (
    <section style={{ background: "#FFF7F3" }}>
      <div className="mx-auto max-w-[1180px] px-5 md:px-6 py-20 md:py-28">
        <AnimatedSection>
          <div className="grid lg:grid-cols-[1fr_1.1fr] gap-10 items-center">
            <div>
              <span className="label-orange">Live Now</span>
              <h2 className="mt-5 font-serif text-[34px] md:text-[44px] leading-[1.2] tracking-[-0.01em]">Today's Case is Live.</h2>
              <p className="mt-4 text-[15px] text-text-secondary leading-[1.65] max-w-[440px]">A new case drops every morning. Solve it, get AI feedback, see your percentile. Miss it, and it locks at midnight.</p>
              <Link to="/login" className="btn-primary mt-6">Solve It — Login to Continue</Link>
            </div>
            <GlowCard className="p-7 md:p-8">
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <span className="pill pill-orange">Market Entry</span>
                    <span className="pill pill-red">Hard</span>
                  </div>
                  <span className="text-[13px] font-semibold" style={{ fontFamily: "var(--font-mono)", color: "#E8490F" }}>{String(h).padStart(2,"0")}:{String(m).padStart(2,"0")} left</span>
                </div>
                <h3 className="mt-5 font-serif text-[22px] md:text-[26px] leading-[1.2]">A leading Indian FMCG company is considering entering the premium pet food market. Should they?</h3>
                <p className="mt-4 text-[14px] text-text-secondary leading-[1.6]">The client is a Rs 12,000 Cr FMCG conglomerate with strong rural distribution. They've noticed premium pet food growing at 28% CAGR in urban India...</p>
                <div className="mt-5 p-4 rounded-lg" style={{ background: "#F3F2EF", filter: "blur(4px)", userSelect: "none", pointerEvents: "none" }}>
                  <p className="text-[13px]">Framework: Start with market sizing → customer segmentation → competitive landscape → channel strategy → financial viability...</p>
                </div>
                <div className="mt-4 flex items-center justify-between text-[12px] text-text-muted">
                  <span>Resembles: McKinsey Round 1</span>
                  <span>143 solved today</span>
                </div>
              </div>
            </GlowCard>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

/* ── HOW IT WORKS ── */
function HowItWorks() {
  const steps = [
    { n: "01", title: "Set your targets", desc: "Pick your target firms and domains. We personalize your daily prep." },
    { n: "02", title: "Solve daily", desc: "Case + guesstimate + news brief. Timed. Scored. Tracked." },
    { n: "03", title: "Track your streak", desc: "See where you rank among your batch. Don't break the chain." },
    { n: "04", title: "Walk in prepared", desc: "Know what each firm asks, how they evaluate, what they want to hear." },
  ];
  return (
    <section id="how-it-works" className="bg-background">
      <div className="mx-auto max-w-[1180px] px-5 md:px-6 py-20 md:py-28">
        <AnimatedSection>
          <h2 className="font-serif text-[34px] md:text-[44px] leading-[1.2] tracking-[-0.01em] text-center">How it works.</h2>
        </AnimatedSection>
        <div className="mt-14 grid md:grid-cols-4 gap-8">
          {steps.map((s, i) => (
            <AnimatedSection key={i} delay={i * 100}>
              <div className="text-center md:text-left">
                <span className="text-[36px] font-bold leading-none" style={{ fontFamily: "var(--font-mono)", color: "#E8490F" }}>{s.n}</span>
                <h3 className="mt-4 text-[17px] font-semibold" style={{ fontFamily: "var(--font-sans)" }}>{s.title}</h3>
                <p className="mt-2 text-[13px] text-text-secondary leading-[1.6]">{s.desc}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── COMPANY INTEL ── */
function CompanyIntel() {
  const firms = [
    { name: "McKinsey", style: "Exhibit-heavy, structured, MECE at every level" },
    { name: "BCG", style: "Creative, data-heavy, comfortable with ambiguity" },
    { name: "Bain", style: "Commercial sense, buddy interviews, strong opinions" },
    { name: "Goldman Sachs", style: "Valuation, market sizing, financial modeling" },
    { name: "HUL", style: "Market entry, rural distribution, P&L management" },
    { name: "Amazon", style: "LP-driven cases, customer obsession, scale thinking" },
  ];
  return (
    <section style={{ background: "#FFF7F3" }}>
      <div className="mx-auto max-w-[1180px] px-5 md:px-6 py-20 md:py-28">
        <AnimatedSection>
          <span className="label-orange">Company Intelligence</span>
          <h2 className="mt-5 font-serif text-[34px] md:text-[44px] leading-[1.2] tracking-[-0.01em]">Know what they want before you walk in.</h2>
          <p className="mt-4 text-[15px] text-text-secondary max-w-[520px]">Interview style, case types, common PI questions, and insider data for 28+ firms.</p>
        </AnimatedSection>
        <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {firms.map((f, i) => (
            <AnimatedSection key={f.name} delay={i * 60}>
              <div className="card-base p-5">
                <h3 className="text-[16px] font-semibold" style={{ fontFamily: "var(--font-sans)" }}>{f.name}</h3>
                <p className="mt-2 text-[13px] text-text-secondary leading-[1.55]">{f.style}</p>
                <Link to="/cases" className="btn-ghost text-[12px] mt-3 inline-block">View Profile →</Link>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── SOCIAL PROOF ── */
function SocialProof() {
  const quotes = [
    { text: "Constrat's daily cases forced me into a routine. By the time interviews came, I'd solved 60+ cases. Got McKinsey shortlist.", name: "Ananya R.", info: "IMI Delhi, Batch 2025" },
    { text: "The company profiles told me exactly what Deloitte asks in Round 2. Walked in knowing the framework they wanted.", name: "Karan M.", info: "IMI Delhi, Batch 2025" },
    { text: "I was doing random prep before Constrat. The streak system and leaderboard made me consistent. 47-day streak and counting.", name: "Priya S.", info: "IMI Delhi, Batch 2026" },
    { text: "The guesstimate practice alone was worth it. 100+ solved, and my speed went from 8 minutes to under 3.", name: "Arjun D.", info: "IMI Delhi, Batch 2025" },
  ];
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-[1180px] px-5 md:px-6 py-20 md:py-28">
        <AnimatedSection><h2 className="font-serif text-[34px] md:text-[44px] leading-[1.2] tracking-[-0.01em] text-center">What students say.</h2></AnimatedSection>
        <div className="mt-12 grid md:grid-cols-2 gap-6">
          {quotes.map((q, i) => (
            <AnimatedSection key={i} delay={i * 80}>
              <div className="card-base p-6">
                <p className="text-[14px] text-text-secondary leading-[1.7] italic">"{q.text}"</p>
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-[13px] font-semibold">{q.name}</p>
                  <p className="text-[12px] text-text-muted">{q.info}</p>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── COLLEGE NETWORK ── */
function CollegeNetwork() {
  const colleges = ["IMI Delhi", "IIM Ahmedabad", "IIM Bangalore", "IIM Kozhikode", "XLRI", "FMS Delhi", "ISB Hyderabad", "MDI Gurgaon"];
  return (
    <section style={{ background: "#FFF7F3" }}>
      <div className="mx-auto max-w-[1180px] px-5 md:px-6 py-20 md:py-28 text-center">
        <AnimatedSection>
          <span className="label-orange">College Network</span>
          <h2 className="mt-5 font-serif text-[34px] md:text-[44px] leading-[1.2] tracking-[-0.01em]">Built for every B-school.</h2>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {colleges.map(c => (
              <span key={c} className="px-5 py-2.5 rounded-lg border text-[13px] font-medium" style={{ borderColor: c === "IMI Delhi" ? "#E8490F" : "#E8E4DE", color: c === "IMI Delhi" ? "#E8490F" : "#5C5C5A", background: c === "IMI Delhi" ? "#FFF0EB" : "#fff" }}>{c}</span>
            ))}
          </div>
          <p className="mt-8 text-[14px] text-text-secondary">Your college isn't here yet? <a href="https://forms.gle/placeholder" target="_blank" rel="noopener noreferrer" className="text-orange font-semibold hover:underline">Bring Constrat to your campus.</a></p>
        </AnimatedSection>
      </div>
    </section>
  );
}

/* ── FINAL CTA ── */
function FinalCTA() {
  return (
    <section className="gradient-cta relative overflow-hidden">
      <div className="mx-auto max-w-[1180px] px-5 md:px-6 py-24 md:py-32 text-center relative z-10">
        <AnimatedSection>
          <h2 className="font-serif text-[36px] sm:text-[48px] md:text-[56px] leading-[1.2] tracking-[-0.01em]" style={{ color: "#F4ECE2" }}>
            Placement season doesn't wait.<br />Neither should you.
          </h2>
          <Link to="/join" className="inline-flex items-center justify-center h-[56px] px-8 rounded-[12px] bg-orange text-white font-semibold text-[16px] hover:bg-orange-hover transition-all hover:-translate-y-px shadow-lg shadow-orange/20 mt-10" style={{ fontFamily: "var(--font-sans)" }}>
            Start Preparing — It's Free
          </Link>
        </AnimatedSection>
      </div>
    </section>
  );
}
