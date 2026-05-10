import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { PageHeader } from "@/components/PageHeader";
import { GlowCard } from "@/components/GlowCard";
import { AnimatedSection } from "@/components/AnimatedSection";
import { useState } from "react";

export const Route = createFileRoute("/leaderboard")({ component: Leaderboard });

const USERS = [
  { rank: 1, name: "Ananya R.", college: "IMI Delhi", cases: 67, guesstimates: 112, streak: 47, longest: 47 },
  { rank: 2, name: "Karan M.", college: "IMI Delhi", cases: 58, guesstimates: 95, streak: 33, longest: 41 },
  { rank: 3, name: "Priya S.", college: "IMI Delhi", cases: 52, guesstimates: 88, streak: 29, longest: 35 },
  { rank: 4, name: "Arjun D.", college: "IMI Delhi", cases: 45, guesstimates: 76, streak: 21, longest: 28 },
  { rank: 5, name: "Sneha K.", college: "IMI Delhi", cases: 41, guesstimates: 63, streak: 18, longest: 24 },
  { rank: 6, name: "Rahul P.", college: "IMI Delhi", cases: 38, guesstimates: 58, streak: 14, longest: 22 },
  { rank: 7, name: "Meera J.", college: "IMI Delhi", cases: 34, guesstimates: 51, streak: 12, longest: 19 },
  { rank: 8, name: "Vikram S.", college: "IMI Delhi", cases: 29, guesstimates: 44, streak: 9, longest: 16 },
  { rank: 9, name: "Neha G.", college: "IMI Delhi", cases: 25, guesstimates: 39, streak: 7, longest: 14 },
  { rank: 10, name: "Amit T.", college: "IMI Delhi", cases: 22, guesstimates: 33, streak: 5, longest: 11 },
].map(u => ({ ...u, score: (u.cases * 3) + (u.guesstimates * 1) + (u.streak * 2) }));

const RANK_COLORS = ["#E8490F", "#FF8C42", "#F59E0B"];

function Leaderboard() {
  const [tab, setTab] = useState<"college"|"global">("college");
  const [period, setPeriod] = useState<"week"|"month"|"all">("week");

  return (
    <PageShell>
      <PageHeader eyebrow="Leaderboard" title="See where you stand." subtitle="Rankings based on cases solved, guesstimates, streaks, and contributions. Updated daily." />
      <div className="mx-auto max-w-[1180px] px-5 md:px-6 -mt-4 pb-20">
        {/* Top 3 podium cards */}
        <div className="grid md:grid-cols-3 gap-5 mb-10">
          {USERS.slice(0, 3).map((u, i) => (
            <AnimatedSection key={u.rank} delay={i * 100}>
              <GlowCard className="p-6 text-center" style={i === 0 ? { borderColor: "rgba(232,73,15,0.4)" } : {}}>
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center text-white text-[20px] font-bold" style={{ background: RANK_COLORS[i], fontFamily: "var(--font-mono)", boxShadow: `0 4px 20px ${RANK_COLORS[i]}40` }}>
                    {u.rank}
                  </div>
                  <h3 className="mt-3 text-[18px] font-semibold">{u.name}</h3>
                  <p className="text-[12px] text-text-muted">{u.college}</p>
                  <p className="mt-3 text-[32px] font-bold leading-none" style={{ fontFamily: "var(--font-mono)", color: RANK_COLORS[i] }}>{u.score}</p>
                  <p className="text-[11px] text-text-muted mt-1">total score</p>
                  <div className="mt-4 pt-4 border-t border-border grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[16px] font-bold" style={{ fontFamily: "var(--font-mono)" }}>{u.cases}</p>
                      <p className="text-[9px] text-text-muted uppercase tracking-[0.08em]">Cases</p>
                    </div>
                    <div>
                      <p className="text-[16px] font-bold" style={{ fontFamily: "var(--font-mono)" }}>{u.guesstimates}</p>
                      <p className="text-[9px] text-text-muted uppercase tracking-[0.08em]">Guess.</p>
                    </div>
                    <div>
                      <p className="text-[16px] font-bold" style={{ fontFamily: "var(--font-mono)", color: "#E8490F" }}>{u.streak}</p>
                      <p className="text-[9px] text-text-muted uppercase tracking-[0.08em]">Streak</p>
                    </div>
                  </div>
                </div>
              </GlowCard>
            </AnimatedSection>
          ))}
        </div>

        {/* Scoring formula */}
        <div className="card-base p-4 mb-6 flex items-center gap-3" style={{ background: "#FFF7F3" }}>
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.08em] shrink-0">Score =</span>
          <p className="text-[12px] text-text-secondary" style={{ fontFamily: "var(--font-mono)" }}>
            (Cases × 3) + (Guesstimates × 1) + (Streak × 2) + (PI × 0.5) + (Reviews × 2) + (Experiences × 5)
          </p>
        </div>

        {/* Tabs + period */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div className="flex gap-1 p-1 rounded-lg bg-muted/60">
            {(["college", "global"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-md text-[13px] font-medium transition-all ${tab === t ? "bg-white text-orange shadow-sm" : "text-text-muted hover:text-text-primary"}`}>
                {t === "college" ? "IMI Delhi" : "Global"}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {(["week", "month", "all"] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${period === p ? "bg-orange text-white" : "text-text-muted hover:text-text-primary"}`}>
                {p === "week" ? "This Week" : p === "month" ? "This Month" : "All Time"}
              </button>
            ))}
          </div>
        </div>

        {/* Remaining users */}
        <div className="space-y-3">
          {USERS.slice(3).map((u, i) => (
            <AnimatedSection key={u.rank} delay={i * 40}>
              <div className="card-base p-4 flex items-center gap-4 hover:border-orange/30">
                <span className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center text-[13px] font-bold text-text-muted shrink-0" style={{ fontFamily: "var(--font-mono)" }}>{u.rank}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold">{u.name}</p>
                  <p className="text-[11px] text-text-muted">{u.college}</p>
                </div>
                <div className="hidden sm:flex items-center gap-6 text-[13px]" style={{ fontFamily: "var(--font-mono)" }}>
                  <div className="text-center"><p className="font-bold">{u.cases}</p><p className="text-[9px] text-text-muted">Cases</p></div>
                  <div className="text-center"><p className="font-bold">{u.guesstimates}</p><p className="text-[9px] text-text-muted">Guess.</p></div>
                  <div className="text-center"><p className="font-bold" style={{ color: "#E8490F" }}>{u.streak}</p><p className="text-[9px] text-text-muted">Streak</p></div>
                </div>
                <p className="text-[18px] font-bold shrink-0" style={{ fontFamily: "var(--font-mono)" }}>{u.score}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>

        {/* Your rank */}
        <div className="mt-6 card-base p-4 flex items-center gap-4" style={{ background: "#FFF7F3", borderColor: "#E8490F", borderWidth: "1.5px" }}>
          <span className="w-9 h-9 rounded-full bg-orange flex items-center justify-center text-white text-[13px] font-bold shrink-0" style={{ fontFamily: "var(--font-mono)" }}>?</span>
          <div className="flex-1">
            <p className="text-[14px] font-semibold">Your Rank</p>
            <p className="text-[12px] text-text-muted">Login to see where you stand</p>
          </div>
          <a href="/join" className="btn-primary h-9 px-5 text-[12px]">Join Now</a>
        </div>
      </div>
    </PageShell>
  );
}
