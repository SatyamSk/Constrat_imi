import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { PageHeader } from "@/components/PageHeader";
import { useState } from "react";

export const Route = createFileRoute("/leaderboard")({ component: Leaderboard });

const USERS = [
  { rank: 1, name: "Ananya R.", college: "IMI Delhi", cases: 67, guesstimates: 112, streak: 47, longest: 47, score: 0 },
  { rank: 2, name: "Karan M.", college: "IMI Delhi", cases: 58, guesstimates: 95, streak: 33, longest: 41, score: 0 },
  { rank: 3, name: "Priya S.", college: "IMI Delhi", cases: 52, guesstimates: 88, streak: 29, longest: 35, score: 0 },
  { rank: 4, name: "Arjun D.", college: "IMI Delhi", cases: 45, guesstimates: 76, streak: 21, longest: 28, score: 0 },
  { rank: 5, name: "Sneha K.", college: "IMI Delhi", cases: 41, guesstimates: 63, streak: 18, longest: 24, score: 0 },
  { rank: 6, name: "Rahul P.", college: "IMI Delhi", cases: 38, guesstimates: 58, streak: 14, longest: 22, score: 0 },
  { rank: 7, name: "Meera J.", college: "IMI Delhi", cases: 34, guesstimates: 51, streak: 12, longest: 19, score: 0 },
  { rank: 8, name: "Vikram S.", college: "IMI Delhi", cases: 29, guesstimates: 44, streak: 9, longest: 16, score: 0 },
  { rank: 9, name: "Neha G.", college: "IMI Delhi", cases: 25, guesstimates: 39, streak: 7, longest: 14, score: 0 },
  { rank: 10, name: "Amit T.", college: "IMI Delhi", cases: 22, guesstimates: 33, streak: 5, longest: 11, score: 0 },
].map(u => ({ ...u, score: (u.cases * 3) + (u.guesstimates * 1) + (u.streak * 2) }));

function Leaderboard() {
  const [tab, setTab] = useState<"global"|"college">("college");
  const [period, setPeriod] = useState<"week"|"month"|"all">("week");

  return (
    <PageShell>
      <PageHeader
        eyebrow="Leaderboard"
        title="See where you stand."
        subtitle="Rankings based on cases solved, guesstimates, streaks, and contributions. Updated daily."
      />

      <div className="mx-auto max-w-[1180px] px-5 md:px-6 -mt-4 pb-20">
        {/* Scoring formula */}
        <div className="card-base p-5 mb-8" style={{ background: "#FFF7F3" }}>
          <p className="text-[12px] font-semibold text-text-muted uppercase tracking-[0.08em] mb-2">Scoring Formula (Transparent)</p>
          <p className="text-[13px] text-text-secondary leading-[1.65]">
            <span style={{ fontFamily: "var(--font-mono)", color: "#E8490F" }}>(Cases x 3)</span> + 
            <span style={{ fontFamily: "var(--font-mono)" }}> (Guesstimates x 1)</span> + 
            <span style={{ fontFamily: "var(--font-mono)" }}> (Current Streak x 2)</span> + 
            <span style={{ fontFamily: "var(--font-mono)" }}> (PI Practiced x 0.5)</span> + 
            <span style={{ fontFamily: "var(--font-mono)" }}> (Reviews x 2)</span> + 
            <span style={{ fontFamily: "var(--font-mono)" }}> (Experiences Submitted x 5)</span>
          </p>
        </div>

        {/* Tabs */}
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

        {/* Table */}
        <div className="card-base overflow-hidden">
          <table className="w-full">
            <thead>
              <tr style={{ background: "#F9F8F6" }}>
                <th className="text-left text-[11px] uppercase tracking-[0.08em] font-semibold text-text-muted py-3 px-4 w-12">Rank</th>
                <th className="text-left text-[11px] uppercase tracking-[0.08em] font-semibold text-text-muted py-3 px-4">User</th>
                <th className="text-center text-[11px] uppercase tracking-[0.08em] font-semibold text-text-muted py-3 px-4 hidden md:table-cell">Cases</th>
                <th className="text-center text-[11px] uppercase tracking-[0.08em] font-semibold text-text-muted py-3 px-4 hidden md:table-cell">Guesstimates</th>
                <th className="text-center text-[11px] uppercase tracking-[0.08em] font-semibold text-text-muted py-3 px-4">Streak</th>
                <th className="text-center text-[11px] uppercase tracking-[0.08em] font-semibold text-text-muted py-3 px-4 hidden lg:table-cell">Longest</th>
                <th className="text-right text-[11px] uppercase tracking-[0.08em] font-semibold text-text-muted py-3 px-4">Score</th>
              </tr>
            </thead>
            <tbody>
              {USERS.map((u, i) => (
                <tr key={i} className="border-t border-border hover:bg-orange-tint/30 transition-colors" style={i === 0 ? { background: "#FFFBF5" } : {}}>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[12px] font-bold ${i < 3 ? "bg-orange text-white" : "bg-muted/60 text-text-muted"}`} style={{ fontFamily: "var(--font-mono)" }}>{u.rank}</span>
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-[14px] font-semibold">{u.name}</p>
                    <p className="text-[11px] text-text-muted">{u.college}</p>
                  </td>
                  <td className="py-3 px-4 text-center text-[14px] hidden md:table-cell" style={{ fontFamily: "var(--font-mono)" }}>{u.cases}</td>
                  <td className="py-3 px-4 text-center text-[14px] hidden md:table-cell" style={{ fontFamily: "var(--font-mono)" }}>{u.guesstimates}</td>
                  <td className="py-3 px-4 text-center text-[14px] font-semibold" style={{ fontFamily: "var(--font-mono)", color: "#E8490F" }}>{u.streak}</td>
                  <td className="py-3 px-4 text-center text-[14px] hidden lg:table-cell" style={{ fontFamily: "var(--font-mono)" }}>{u.longest}</td>
                  <td className="py-3 px-4 text-right text-[15px] font-bold" style={{ fontFamily: "var(--font-mono)" }}>{u.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Your rank pinned */}
        <div className="mt-4 card-base p-4 flex items-center justify-between" style={{ background: "#FFF7F3", borderColor: "#E8490F", borderWidth: "1px" }}>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange text-white text-[12px] font-bold" style={{ fontFamily: "var(--font-mono)" }}>--</span>
            <div>
              <p className="text-[14px] font-semibold">Your Rank</p>
              <p className="text-[12px] text-text-muted">Login to see your position</p>
            </div>
          </div>
          <p className="text-[13px] text-orange font-semibold">Login to track</p>
        </div>
      </div>
    </PageShell>
  );
}
