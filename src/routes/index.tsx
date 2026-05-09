import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { AnimatedSection } from "@/components/AnimatedSection";
import { GlowCard } from "@/components/GlowCard";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <PageShell>
      <Hero />
      <SocialProof />
      <TryNow />
      <CompanyTracks />
      <FrameworkOfWeek />
      <CompetitionsTeaser />
      <NewsTeaser />
      <LeaderboardTeaser />
      <JoinCTA />
    </PageShell>
  );
}

function Hero() {
  const [c, setC] = useState(0);
  useEffect(() => { const t = setInterval(() => setC(p => (p < 47 ? p + 1 : p)), 60); return () => clearInterval(t); }, []);
  return (
    <section className="gradient-hero relative overflow-hidden">
      <div className="absolute top-[-200px] right-[-100px] w-[500px] h-[500px] rounded-full bg-orange/5 blur-[120px] pointer-events-none" />
      <div className="mx-auto max-w-[1180px] px-5 md:px-6 pt-28 md:pt-[140px] pb-16 md:pb-24 relative z-10">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-14 items-center">
          <div className="slide-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange/10 border border-orange/20 text-[12px] text-orange font-semibold">
              <span className="pulse-dot" /> {c} students active right now
            </div>
            <h1 className="mt-5 font-serif font-extrabold text-[42px] sm:text-[54px] md:text-[64px] leading-[0.96] tracking-[-0.03em] text-text-primary">
              Your unfair<br />advantage for<br /><span className="text-gradient">placements.</span>
            </h1>
            <p className="mt-5 text-[16px] md:text-[17px] text-text-secondary max-w-[460px] leading-[1.65]">
              Case practice, company-specific prep, 120+ decks, daily questions, live timetable, alumni intel - everything an IMI student needs.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link to="/join" className="btn-primary">Get Started Free</Link>
              <Link to="/practice" className="btn-secondary">Try a Question</Link>
            </div>
            <div className="mt-6 flex items-center gap-4 text-[12px] text-text-muted">
              <span>No credit card</span>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span>Free for all IMI students</span>
            </div>
          </div>
          <AnimatedSection delay={200}>
            <QuickAttempt />
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}

function QuickAttempt() {
  const [show, setShow] = useState(false);
  const [ans, setAns] = useState("");
  return (
    <GlowCard className="p-6 md:p-7">
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <span className="label-orange">Today&apos;s Question</span>
          <span className="pill pill-orange">Guestimate</span>
        </div>
        <p className="mt-4 font-serif text-[20px] md:text-[22px] leading-[1.25] text-text-primary">
          How many cups of chai are sold daily across all railway stations in India?
        </p>
        <div className="mt-4 flex gap-2 flex-wrap">
          <span className="pill">Operations</span>
          <span className="pill">Medium</span>
          <span className="pill">MBB Reported</span>
        </div>
        {!show ? (
          <button onClick={() => setShow(true)} className="btn-primary mt-5 w-full">Attempt Now</button>
        ) : (
          <div className="mt-5 space-y-3">
            <textarea value={ans} onChange={e => setAns(e.target.value)} placeholder="Type your approach..." className="input-base w-full h-24 resize-none text-[14px]" />
            <div className="flex gap-2">
              <Link to="/practice" className="btn-primary flex-1 text-center">Submit &amp; See More</Link>
              <button onClick={() => setShow(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        )}
        <p className="mt-3 text-[12px] text-text-muted">143 students attempted today</p>
      </div>
    </GlowCard>
  );
}

function SocialProof() {
  const stats = [
    { n: "120+", l: "Case Decks", sub: "McKinsey, BCG, Bain, Deloitte" },
    { n: "500+", l: "Questions", sub: "Guestimates, Cases, GDs, HR" },
    { n: "14", l: "Core Members", sub: "Batch 2024 + 2025" },
    { n: "7,000+", l: "Attempts", sub: "And counting this semester" },
  ];
  return (
    <section className="bg-dark text-white">
      <div className="mx-auto max-w-[1180px] px-5 md:px-6 py-8 md:py-10 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
        {stats.map(s => (
          <div key={s.l} className="text-center md:text-left">
            <p className="font-serif text-[32px] md:text-[36px] font-bold text-orange leading-none">{s.n}</p>
            <p className="mt-1 text-[14px] font-semibold text-white/90">{s.l}</p>
            <p className="mt-0.5 text-[11px] text-white/40">{s.sub}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TryNow() {
  const qs = [
    { type: "GUESTIMATE", q: "Estimate the annual revenue of Zomato's delivery fleet in Mumbai.", d: "Medium", fn: "Operations" },
    { type: "CASE", q: "A D2C skincare brand is losing repeat customers. Diagnose.", d: "Hard", fn: "Marketing" },
    { type: "GD TOPIC", q: "Should India ban unpaid internships?", d: "Easy", fn: "HR" },
    { type: "INTERVIEW Q", q: "Walk me through how you'd evaluate an acquisition target.", d: "Hard", fn: "Finance" },
    { type: "GUESTIMATE", q: "Number of elevators in Gurugram right now.", d: "Medium", fn: "Consulting" },
    { type: "CASE", q: "An airline wants to enter the cargo-only business. Should they?", d: "Hard", fn: "Strategy" },
  ];
  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-[1180px] px-5 md:px-6 py-16 md:py-[90px]">
        <AnimatedSection>
          <span className="label-orange">Daily Practice</span>
          <h2 className="mt-4 font-serif text-[34px] md:text-[40px] font-semibold leading-[1.05] tracking-[-0.025em]">New questions every day. No excuses.</h2>
          <p className="mt-3 text-[15px] text-text-secondary max-w-[540px]">Guestimates, case crackers, GD topics, HR questions - filtered by function and difficulty. Build your streak.</p>
        </AnimatedSection>
        <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {qs.map((x, i) => (
            <AnimatedSection key={i} delay={i * 60}>
              <div className="card-base p-5 h-full flex flex-col">
                <p className="text-[10px] uppercase tracking-[0.08em] font-semibold" style={{ color: x.type === "GUESTIMATE" || x.type === "CASE" ? "#E8490F" : "#5C5C5A" }}>{x.type}</p>
                <p className="mt-2 text-[15px] font-semibold leading-[1.45] text-text-primary flex-1">{x.q}</p>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex gap-1.5"><span className="pill pill-orange">{x.d}</span><span className="pill">{x.fn}</span></div>
                  <Link to="/practice" className="btn-ghost text-[12px]">Attempt</Link>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
        <div className="mt-8 text-center"><Link to="/practice" className="btn-primary">See All 500+ Questions &rarr;</Link></div>
      </div>
    </section>
  );
}

function CompanyTracks() {
  const cos = [
    { name: "McKinsey", focus: "Problem-solving, PEI stories, exhibit reading", tip: "Structure > speed. They want MECE at every level." },
    { name: "BCG", focus: "Creativity, data-heavy cases, guesstimate combos", tip: "Show you can handle ambiguity. Charts are your friend." },
    { name: "Bain", focus: "Commercial sense, buddy interviews, partner fit", tip: "Be opinionated. They like conviction backed by logic." },
    { name: "Deloitte S&O", focus: "Industry expertise, implementation plans", tip: "Go deep on one sector. Show you can build, not just advise." },
    { name: "Accenture Strategy", focus: "Digital transformation, tech-enabled solutions", tip: "Bridge strategy and tech. Know AI/cloud use cases." },
    { name: "Goldman Sachs", focus: "Valuation, market sizing, financial modeling", tip: "DCF cold. Know LBO basics. Read deal news daily." },
  ];
  return (
    <section className="bg-section-alt">
      <div className="mx-auto max-w-[1180px] px-5 md:px-6 py-16 md:py-[90px]">
        <AnimatedSection>
          <span className="label-orange">Company-Specific Prep</span>
          <h2 className="mt-4 font-serif text-[34px] md:text-[40px] font-semibold leading-[1.05] tracking-[-0.025em]">Know exactly what they want.</h2>
          <p className="mt-3 text-[15px] text-text-secondary max-w-[560px]">Each firm has a style. We break it down so you walk in prepared, not surprised.</p>
        </AnimatedSection>
        <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cos.map((c, i) => (
            <AnimatedSection key={c.name} delay={i * 60}>
              <GlowCard className="p-5 h-full"><div className="relative z-10 flex flex-col h-full">
                <h3 className="text-[18px] font-semibold text-text-primary">{c.name}</h3>
                <p className="mt-2 text-[13px] text-text-secondary leading-[1.55]"><strong>Focus:</strong> {c.focus}</p>
                <p className="mt-2 text-[13px] text-orange leading-[1.55] italic flex-1">&ldquo;{c.tip}&rdquo;</p>
                <Link to="/cases" className="btn-ghost text-[12px] mt-4 inline-block">View {c.name} Decks &rarr;</Link>
              </div></GlowCard>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}

function FrameworkOfWeek() {
  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-[1180px] px-5 md:px-6 py-16 md:py-[90px] grid lg:grid-cols-2 gap-10 items-center">
        <AnimatedSection>
          <span className="label-orange">Framework of the Week</span>
          <h2 className="mt-4 font-serif text-[34px] md:text-[38px] font-semibold leading-[1.08] tracking-[-0.025em]">Porter&apos;s Five Forces</h2>
          <p className="mt-4 text-[15px] text-text-secondary leading-[1.65]">The go-to framework for industry analysis. Use it to evaluate competitive intensity, supplier/buyer power, threat of substitutes, and barriers to entry.</p>
          <div className="mt-5 space-y-2 text-[14px]">
            <p><strong className="text-orange">When to use:</strong> Market entry cases, industry attractiveness, competitive strategy</p>
            <p><strong className="text-orange">Pro tip:</strong> Don&apos;t just list the forces. Rank them by impact and explain why.</p>
          </div>
          <Link to="/practice" className="btn-primary mt-6">Practice Cases Using This</Link>
        </AnimatedSection>
        <AnimatedSection delay={150}>
          <div className="card-base p-6 space-y-3">
            {["Threat of New Entrants","Bargaining Power of Suppliers","Bargaining Power of Buyers","Threat of Substitutes","Competitive Rivalry"].map((f,i) => (
              <div key={f} className="flex items-center gap-3 p-3 rounded-lg bg-orange-tint/40">
                <span className="w-8 h-8 rounded-lg bg-orange text-white flex items-center justify-center font-serif font-bold text-[13px]">{i+1}</span>
                <span className="text-[14px] font-medium text-text-primary">{f}</span>
              </div>
            ))}
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

function CompetitionsTeaser() {
  const comps = [
    { name: "Unstop Case Challenge 2026", org: "Unstop", deadline: "May 25, 2026", prize: "Rs 3,00,000", tag: "Live" },
    { name: "Deloitte Maverick S9", org: "Grad Partners", deadline: "Jun 1, 2026", prize: "PPO + Rs 5L", tag: "Opening Soon" },
    { name: "Flipkart GRiD 7.0", org: "Unstop", deadline: "May 30, 2026", prize: "Rs 4,00,000", tag: "Live" },
  ];
  return (
    <section className="bg-section-alt">
      <div className="mx-auto max-w-[1180px] px-5 md:px-6 py-16 md:py-[90px]">
        <AnimatedSection>
          <span className="label-orange">Competitions</span>
          <h2 className="mt-4 font-serif text-[34px] md:text-[40px] font-semibold leading-[1.05] tracking-[-0.025em]">Don&apos;t miss what&apos;s out there.</h2>
        </AnimatedSection>
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          {comps.map((c, i) => (
            <AnimatedSection key={c.name} delay={i * 80}><GlowCard className="p-5 h-full"><div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center justify-between"><span className="text-[11px] uppercase tracking-[0.08em] text-text-muted">{c.org}</span><span className={`pill ${c.tag === "Live" ? "pill-red" : "pill-orange"}`}>{c.tag}</span></div>
              <h3 className="mt-3 text-[16px] font-semibold leading-[1.35]">{c.name}</h3>
              <div className="mt-auto pt-4 flex items-center justify-between"><div><p className="text-[12px] text-text-muted">Deadline: {c.deadline}</p><p className="text-[13px] font-semibold text-orange mt-0.5">{c.prize}</p></div></div>
            </div></GlowCard></AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}

function NewsTeaser() {
  const items = [
    { src: "Economic Times", title: "RBI holds repo rate at 6.5%, signals cautious stance.", url: "https://economictimes.indiatimes.com" },
    { src: "Reuters", title: "TCS posts Rs 61,000Cr Q4 revenue, deal pipeline at 5-year high.", url: "https://www.reuters.com/world/india/" },
    { src: "Bloomberg", title: "Zepto closes $665M round, valuation crosses $5B.", url: "https://www.bloomberg.com/asia" },
  ];
  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-[1180px] px-5 md:px-6 py-16 md:py-[90px]">
        <AnimatedSection><span className="label-orange">Business News</span><h2 className="mt-4 font-serif text-[34px] md:text-[40px] font-semibold leading-[1.05] tracking-[-0.025em]">Read what your interviewer reads.</h2></AnimatedSection>
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          {items.map((n, i) => (
            <AnimatedSection key={i} delay={i * 80}><div className="card-base p-5"><p className="text-[11px] uppercase tracking-[0.08em] text-text-muted">{n.src}</p><h3 className="mt-2 text-[15px] font-semibold leading-[1.4]">{n.title}</h3><a href={n.url} target="_blank" rel="noopener noreferrer" className="btn-ghost text-[12px] mt-3 inline-block">Read &rarr;</a></div></AnimatedSection>
          ))}
        </div>
        <div className="mt-6 text-center"><Link to="/news" className="btn-ghost">All News &rarr;</Link></div>
      </div>
    </section>
  );
}

function LeaderboardTeaser() {
  const rows = [
    { rank: 1, name: "Jainishha Sethia", pts: 100 },
    { rank: 2, name: "Adesh", pts: 100 },
    { rank: 3, name: "Satyam", pts: 100 },
    { rank: 4, name: "Aheli", pts: 100 },
    { rank: 5, name: "Shambhavi", pts: 100 },
  ];
  return (
    <section className="bg-section-alt">
      <div className="mx-auto max-w-[1180px] px-5 md:px-6 py-16 md:py-[90px]">
        <AnimatedSection><span className="label-orange">Leaderboard</span><h2 className="mt-4 font-serif text-[34px] md:text-[40px] font-semibold leading-[1.05] tracking-[-0.025em]">Who&apos;s putting in the work.</h2></AnimatedSection>
        <AnimatedSection delay={100}>
          <div className="mt-8 card-base divide-y divide-border">
            {rows.map(r => (
              <div key={r.rank} className="flex items-center gap-4 px-5 py-4 hover:bg-orange-tint/30 transition-colors">
                <span className="font-serif text-[22px] font-light text-orange w-8">{String(r.rank).padStart(2, "0")}</span>
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-[12px] shrink-0" style={{ background: "#FFF0EB", color: "#C03A08" }}>{r.name.split(" ").map(s => s[0]).join("")}</div>
                <p className="text-[14px] font-semibold flex-1">{r.name}</p>
                <span className="text-[14px] font-semibold text-orange">{r.pts} pts</span>
              </div>
            ))}
          </div>
          <div className="mt-5 text-center"><Link to="/leaderboard" className="btn-ghost text-[13px]">Full Leaderboard &rarr;</Link></div>
        </AnimatedSection>
      </div>
    </section>
  );
}

function JoinCTA() {
  return (
    <section className="gradient-cta relative overflow-hidden">
      <div className="mx-auto max-w-[1180px] px-5 md:px-6 py-20 md:py-[100px] text-center relative z-10">
        <AnimatedSection>
          <h2 className="font-serif text-[36px] sm:text-[44px] md:text-[52px] font-semibold leading-[1.05] tracking-[-0.025em] text-[#F4ECE2]">Stop preparing alone.</h2>
          <p className="mt-5 text-[16px] max-w-[500px] mx-auto text-[#A8A199]">Join Constrat. Access every case deck, daily questions, company prep tracks, and a community that pushes you.</p>
          <Link to="/join" className="inline-flex items-center justify-center h-[52px] px-7 rounded-[14px] bg-orange text-white font-semibold text-[15px] hover:bg-orange-hover transition-all hover:-translate-y-px shadow-lg shadow-orange/20 mt-8">Join Constrat Free</Link>
        </AnimatedSection>
      </div>
    </section>
  );
}
