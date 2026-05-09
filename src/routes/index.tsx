import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { AnimatedSection } from "@/components/AnimatedSection";
import { GlowCard } from "@/components/GlowCard";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <PageShell>
      <Hero />
      <MarqueeBand />
      <Features />
      <PracticeTeaser />
      <NewsTeaser />
      <LeaderboardTeaser />
      <AlumniTeaser />
      <JoinCTA />
    </PageShell>
  );
}

function Hero() {
  return (
    <section className="gradient-hero relative overflow-hidden">
      <div className="absolute top-[-200px] right-[-100px] w-[500px] h-[500px] rounded-full bg-orange/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-100px] left-[-200px] w-[400px] h-[400px] rounded-full bg-orange/3 blur-[100px] pointer-events-none" />
      <div className="mx-auto max-w-[1180px] px-5 md:px-6 pt-28 md:pt-[140px] pb-20 md:pb-28 grid lg:grid-cols-[55fr_45fr] gap-10 lg:gap-14 items-start relative z-10">
        <div className="slide-up">
          <span className="label-orange">IMI Delhi - Consulting and Strategy Club</span>
          <h1 className="mt-6 font-serif font-extrabold text-[44px] sm:text-[56px] md:text-[68px] lg:text-[76px] leading-[0.96] tracking-[-0.03em] text-text-primary">
            Prepare Smarter.<br />
            <span className="text-gradient">Place Better.</span>
          </h1>
          <p className="mt-5 text-[17px] md:text-[18px] text-text-secondary max-w-[500px] leading-[1.65]">
            Daily case questions, curated business news, live timetable alerts, 120+ case decks, and a community of future consultants.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/practice" className="btn-primary">Start Practicing</Link>
            <Link to="/cases" className="btn-secondary">Browse Case Decks</Link>
          </div>
        </div>

        <div className="relative min-h-[380px] md:min-h-[460px] hero-cards-cluster">
          <AnimatedSection delay={200}>
            <GlowCard className="p-6 relative z-30 max-w-[400px] ml-auto">
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <span className="label-orange">Daily Practice</span>
                </div>
                <p className="mt-4 text-[16px] font-semibold text-text-primary leading-[1.45]">
                  Estimate the number of coffee cups consumed in Delhi in a single day.
                </p>
                <div className="mt-5 flex items-center justify-between">
                  <span className="pill pill-orange">Medium</span>
                  <Link to="/practice" className="btn-ghost text-[13px]">Attempt</Link>
                </div>
              </div>
            </GlowCard>
          </AnimatedSection>

          <AnimatedSection delay={400}>
            <GlowCard className="p-6 relative z-20 max-w-[380px] -mt-3 md:-mt-4 ml-4 lg:ml-2">
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <span className="label-eyebrow">Business News</span>
                  <span className="inline-flex items-center gap-2 text-[11px] text-success font-medium uppercase tracking-wide">
                    <span className="pulse-dot" /> Live
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  <div>
                    <p className="text-[14px] font-semibold leading-[1.45]">RBI holds repo rate at 6.5%, signals cautious stance on inflation.</p>
                    <p className="text-[12px] text-text-muted mt-1">Reuters - 2h ago</p>
                  </div>
                  <div className="border-t border-border pt-3">
                    <p className="text-[14px] font-semibold leading-[1.45]">Zomato quick-commerce arm Blinkit crosses 3,000Cr GMV.</p>
                    <p className="text-[12px] text-text-muted mt-1">Economic Times - 4h ago</p>
                  </div>
                </div>
              </div>
            </GlowCard>
          </AnimatedSection>

          <AnimatedSection delay={600}>
            <div className="card-base p-5 relative z-10 max-w-[360px] -mt-3 md:-mt-4 ml-8 lg:ml-10" style={{ borderLeft: "4px solid #E8490F" }}>
              <div className="relative z-10">
                <p className="text-[11px] uppercase tracking-[0.08em] text-orange font-semibold">Deadline Alert</p>
                <p className="mt-2 text-[14px] font-semibold leading-[1.45]">
                  Summer Internship Preferences - Submit by May 12
                </p>
                <p className="mt-1 text-[12px] text-text-secondary">PlaceComm - Batch 2026 - All Sections</p>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}

function MarqueeBand() {
  const items = ["Case Competitions", "SIP Prep", "Final Placement", "GD Topics", "Interview Questions", "Timetable Alerts", "Business News", "Case Repositories", "Alumni Network", "Deadline Tracker"];
  return (
    <div className="bg-gradient-to-r from-orange via-[#D4400D] to-orange h-[48px] flex items-center marquee">
      <div className="marquee-track">
        {[0, 1].map((k) => (
          <div key={k} className="inline-flex gap-10 px-5">
            {items.map((t) => (
              <span key={t} className="text-white/90 text-[13px] font-medium tracking-wide">{t}</span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Features() {
  const items = [
    { title: "Daily Practice", body: "Guestimates, case questions, and interview Qs - fresh every day.", to: "/practice", num: "01" },
    { title: "Case Repository", body: "120+ case decks from McKinsey, BCG, Deloitte - searchable and downloadable.", to: "/cases", num: "02" },
    { title: "Business News", body: "Curated RSS feeds. Location-aware news. AI-summarized for GD prep.", to: "/news", num: "03" },
    { title: "Live Timetable", body: "Auto-synced from official timetable every 2 hours. Section filters.", to: "/timetable", num: "04" },
    { title: "Deadline Tracker", body: "Never miss a PlaceComm deadline. Auto-extracted with countdowns.", to: "/deadlines", num: "05" },
    { title: "Alumni Network", body: "Where Constrat alumni landed. Filter by company or batch.", to: "/alumni", num: "06" },
  ];
  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-[1180px] px-5 md:px-6 py-20 md:py-[100px]">
        <AnimatedSection className="text-center">
          <span className="label-orange">The Platform</span>
          <h2 className="mt-5 font-serif font-semibold text-[36px] md:text-[44px] leading-[1.05] tracking-[-0.025em]">
            One platform. Every edge you need.
          </h2>
        </AnimatedSection>
        <div className="mt-12 md:mt-14 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((it, i) => (
            <AnimatedSection key={it.title} delay={i * 80}>
              <Link to={it.to} className="block h-full">
                <GlowCard className="p-6 h-full group">
                  <div className="relative z-10">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-[15px] font-serif font-bold bg-orange-tint text-orange">
                      {it.num}
                    </div>
                    <h3 className="mt-4 text-[18px] font-semibold text-text-primary">{it.title}</h3>
                    <p className="mt-2 text-[14px] text-text-secondary leading-[1.6]">{it.body}</p>
                  </div>
                </GlowCard>
              </Link>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}

function PracticeTeaser() {
  return (
    <section className="bg-section-alt">
      <div className="mx-auto max-w-[1180px] px-5 md:px-6 py-20 md:py-[100px] grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
        <AnimatedSection>
          <span className="label-eyebrow">Practice - Daily</span>
          <h2 className="mt-4 font-serif text-[36px] md:text-[40px] font-semibold leading-[1.05] tracking-[-0.025em]">
            A new question, every single day.
          </h2>
          <p className="mt-5 text-[16px] text-text-secondary leading-[1.65] max-w-[480px]">
            Guestimates, case cracking, GD topics, interview questions - organized by Marketing, Finance, Operations, Consulting, HR, Strategy.
          </p>
          <Link to="/practice" className="btn-primary mt-7">Go to Practice</Link>
        </AnimatedSection>
        <AnimatedSection delay={150}>
          <GlowCard className="p-6">
            <div className="relative z-10">
              <div className="mt-5">
                <span className="label-orange">Today&apos;s Guestimate</span>
                <p className="mt-3 font-serif text-[20px] md:text-[22px] leading-[1.25] text-text-primary">
                  Estimate the daily revenue of all auto-rickshaws in Bengaluru.
                </p>
                <div className="mt-4 flex gap-2 flex-wrap">
                  <span className="pill pill-orange">Medium</span>
                  <span className="pill">Operations</span>
                </div>
                <Link to="/practice" className="btn-primary mt-6 w-full">Attempt Today&apos;s Question</Link>
              </div>
            </div>
          </GlowCard>
        </AnimatedSection>
      </div>
    </section>
  );
}

function NewsTeaser() {
  const items = [
    { src: "Economic Times", topic: "Macro", title: "RBI holds repo rate at 6.5%, signals cautious stance on inflation.", sum: "Liquidity tight; banks expected to hold deposit rates steady through Q2." },
    { src: "Reuters", topic: "Markets", title: "TCS posts Rs 61,000Cr Q4 revenue, deal pipeline at 5-year high.", sum: "BFSI weak in NA; manufacturing pull strong from Europe." },
    { src: "Bloomberg", topic: "Startup", title: "Zepto closes $665M round, valuation crosses $5B.", sum: "Quick-commerce GMV race intensifies ahead of festive Q3." },
  ];
  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-[1180px] px-5 md:px-6 py-20 md:py-[100px]">
        <AnimatedSection>
          <span className="label-orange">Today In Business</span>
          <h2 className="mt-4 font-serif text-[36px] md:text-[40px] font-semibold leading-[1.05] tracking-[-0.025em] max-w-[700px]">
            News that actually matters for GDs and interviews.
          </h2>
        </AnimatedSection>
        <div className="mt-10 md:mt-12 grid md:grid-cols-3 gap-5">
          {items.map((n, i) => (
            <AnimatedSection key={n.title} delay={i * 100}>
              <GlowCard className="p-6 h-full">
                <div className="relative z-10 flex flex-col h-full">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-text-muted">{n.src}</p>
                  <h3 className="mt-3 text-[17px] font-semibold leading-[1.4]">{n.title}</h3>
                  <p className="mt-3 text-[13px] italic text-text-secondary leading-[1.6] flex-1">{n.sum}</p>
                  <div className="mt-5 flex items-center justify-between">
                    <span className="pill">{n.topic}</span>
                    <Link to="/news" className="btn-ghost text-[13px]">Read</Link>
                  </div>
                </div>
              </GlowCard>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}

function LeaderboardTeaser() {
  const rows = [
    { rank: 1, name: "Aarav Mehta", batch: "Batch 2025 - Sec A", pts: 1240 },
    { rank: 2, name: "Priya Nair", batch: "Batch 2025 - Sec B", pts: 1110 },
    { rank: 3, name: "Karan Shah", batch: "Batch 2026 - Sec A", pts: 980 },
    { rank: 4, name: "Ishita Roy", batch: "Batch 2025 - Sec C", pts: 905 },
    { rank: 5, name: "Vivaan Kapoor", batch: "Batch 2026 - Sec B", pts: 870 },
  ];
  return (
    <section className="bg-section-alt">
      <div className="mx-auto max-w-[1180px] px-5 md:px-6 py-20 md:py-[100px]">
        <AnimatedSection>
          <span className="label-orange">Contribution Leaderboard</span>
          <h2 className="mt-4 font-serif text-[36px] md:text-[40px] font-semibold leading-[1.05] tracking-[-0.025em]">
            The most active Constrat members.
          </h2>
        </AnimatedSection>
        <AnimatedSection delay={200}>
          <div className="mt-10 card-base divide-y divide-border">
            {rows.map((r) => (
              <div key={r.rank} className="flex items-center gap-4 md:gap-5 px-4 md:px-6 py-4 md:py-5 transition-colors hover:bg-orange-tint/30">
                <span className="font-serif text-[24px] md:text-[28px] font-light text-orange w-10 md:w-12 shrink-0">
                  {String(r.rank).padStart(2, "0")}
                </span>
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center font-semibold text-[12px] md:text-[13px] shrink-0" style={{ background: "#FFF0EB", color: "#C03A08" }}>
                  {r.name.split(" ").map((s) => s[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] md:text-[15px] font-semibold truncate">{r.name}</p>
                  <p className="text-[12px] text-text-muted">{r.batch}</p>
                </div>
                <span className="text-[14px] md:text-[15px] font-semibold text-orange shrink-0">{r.pts.toLocaleString()} pts</span>
              </div>
            ))}
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

function AlumniTeaser() {
  const a = [
    { name: "Priyansh Mehta", batch: "Batch 2024" },
    { name: "Kalloljyoti Ojah", batch: "Batch 2024" },
    { name: "Anshul Sharma", batch: "Batch 2024" },
  ];
  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-[1180px] px-5 md:px-6 py-20 md:py-[100px]">
        <AnimatedSection>
          <span className="label-orange">Constrat Alumni</span>
          <h2 className="mt-4 font-serif text-[36px] md:text-[40px] font-semibold leading-[1.05] tracking-[-0.025em]">
            See where Constrat takes you.
          </h2>
        </AnimatedSection>
        <div className="mt-10 md:mt-12 grid md:grid-cols-3 gap-5">
          {a.map((p, i) => (
            <AnimatedSection key={p.name} delay={i * 100}>
              <GlowCard className="p-6">
                <div className="relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center font-semibold text-[14px]" style={{ background: "#FFF0EB", color: "#C03A08" }}>
                      {p.name.split(" ").map((s) => s[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-[16px] font-semibold">{p.name}</p>
                      <p className="text-[13px] text-text-muted">{p.batch}</p>
                    </div>
                  </div>
                  <Link to="/alumni" className="btn-ghost text-[13px] mt-5 inline-block">View Profile</Link>
                </div>
              </GlowCard>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}

function JoinCTA() {
  return (
    <section className="gradient-cta relative overflow-hidden">
      <div className="mx-auto max-w-[1180px] px-5 md:px-6 py-20 md:py-[120px] text-center relative z-10">
        <AnimatedSection>
          <h2 className="font-serif text-[36px] sm:text-[44px] md:text-[56px] font-semibold leading-[1.05] tracking-[-0.025em] text-[#F4ECE2]">
            Constrat is building something real.
          </h2>
          <p className="mt-6 text-[16px] md:text-[17px] max-w-[560px] mx-auto text-[#A8A199]">
            Join the community. Access every tool. Contribute and earn your rank.
          </p>
          <div className="mt-9 flex flex-col items-center gap-3">
            <Link to="/join" className="inline-flex items-center justify-center h-[52px] px-7 rounded-[14px] bg-orange text-white font-semibold text-[15px] hover:bg-orange-hover transition-all hover:-translate-y-px shadow-lg shadow-orange/20">
              Join Constrat
            </Link>
            <Link to="/login" className="text-[13px] text-[#A8A199] hover:text-white transition-colors">
              Already a member? Login
            </Link>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
