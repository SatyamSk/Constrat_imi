import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell, PageHeader } from "@/components/PageShell";

export const Route = createFileRoute("/leaderboard")({
  component: Leaderboard,
});

const ROWS = [
  { rank: 1, name: "Jainishha Sethia", batch: "Batch 2025", pts: 100, badges: ["Core Team", "Case Uploader", "Practice Streak"], pct: 100 },
  { rank: 2, name: "Adesh", batch: "Batch 2025", pts: 100, badges: ["Core Team", "News Curator", "Event Volunteer"], pct: 100 },
  { rank: 3, name: "Satyam", batch: "Batch 2025", pts: 100, badges: ["Core Team", "Platform Builder", "Practice Streak"], pct: 100 },
  { rank: 4, name: "Aheli", batch: "Batch 2025", pts: 100, badges: ["Core Team", "Case Uploader"], pct: 100 },
  { rank: 5, name: "Shambhavi", batch: "Batch 2025", pts: 100, badges: ["Core Team", "News Sharer"], pct: 100 },
  { rank: 6, name: "Sagni", batch: "Batch 2025", pts: 100, badges: ["Core Team", "Event Volunteer"], pct: 100 },
  { rank: 7, name: "Divyanshi", batch: "Batch 2025", pts: 100, badges: ["Core Team", "Practice Streak"], pct: 100 },
];

const POINTS = [
  { a: "Upload a case deck", p: "+50 pts" },
  { a: "Daily question attempt", p: "+10 pts" },
  { a: "Share a news article", p: "+5 pts" },
  { a: "7-day practice streak", p: "+75 pts" },
  { a: "Volunteer for event", p: "+100 pts" },
  { a: "Refer a member who joins", p: "+30 pts" },
  { a: "First in section to attempt daily Q", p: "+20 pts" },
];

function Leaderboard() {
  const [tab, setTab] = useState("This Month");

  return (
    <PageShell>
      <PageHeader
        eyebrow="Contribution Leaderboard"
        title="Who's putting in the work."
        subtitle="Points earned by uploading cases, sharing news, attempting questions, helping with events."
      >
        <div className="flex gap-6 border-b border-border -mb-2">
          {["This Month", "This Semester", "All Time"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="pb-3 text-[14px] font-medium relative"
              style={{ color: tab === t ? "#E8490F" : "#5C5C5A" }}
            >
              {t}
              {tab === t && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-orange" />}
            </button>
          ))}
        </div>
      </PageHeader>

      {/* Podium */}
      <section className="bg-background">
        <div className="mx-auto max-w-[920px] px-6 py-16">
          <div className="grid grid-cols-3 items-end gap-4">
            <Podium r={ROWS[1]} h={140} />
            <Podium r={ROWS[0]} h={200} top />
            <Podium r={ROWS[2]} h={110} />
          </div>
        </div>
      </section>

      {/* Table */}
      <section className="bg-background">
        <div className="mx-auto max-w-[1180px] px-6 pb-16">
          <div className="card-base overflow-x-auto">
            <div className="min-w-[700px]">
              <div className="grid grid-cols-[60px_1.5fr_120px_120px_1.6fr_180px] px-6 py-3 text-[11px] uppercase tracking-[0.08em] font-semibold text-text-muted border-b border-border bg-muted/30">
                <span>Rank</span><span>Member</span><span>Batch</span><span>Points</span><span>Badges</span><span>This Month</span>
              </div>
              {ROWS.map((r) => (
                <div key={r.rank} className="grid grid-cols-[60px_1.5fr_120px_120px_1.6fr_180px] px-6 py-4 items-center border-b border-border last:border-b-0">
                  <span className="font-serif text-[20px] text-text-primary">{String(r.rank).padStart(2, "0")}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold" style={{ background: "#FFF0EB", color: "#C03A08" }}>
                      {r.name.split(" ").map((s) => s[0]).join("")}
                    </div>
                    <span className="text-[14px] font-semibold">{r.name}</span>
                  </div>
                  <span className="text-[12px] text-text-muted">{r.batch}</span>
                  <span className="text-[16px] font-semibold text-orange">{r.pts}</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {r.badges.slice(0, 3).map((b) => <span key={b} className="pill">{b}</span>)}
                    {r.badges.length > 3 && <span className="pill">+{r.badges.length - 3}</span>}
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-orange" style={{ width: `${r.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How to earn */}
      <section style={{ background: "#FFF7F3" }}>
        <div className="mx-auto max-w-[1180px] px-6 py-[100px]">
          <span className="label-orange">How Points Work</span>
          <h2 className="mt-4 font-serif text-[36px] font-semibold leading-[1.1] tracking-[-0.025em]">
            Show up. Contribute. Climb.
          </h2>
          <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {POINTS.map((p) => (
              <div key={p.a} className="card-base p-5 flex items-center justify-between">
                <span className="text-[14px] font-medium text-text-primary">{p.a}</span>
                <span className="pill pill-orange">{p.p}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function Podium({ r, h, top = false }: { r: typeof ROWS[0]; h: number; top?: boolean }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="rounded-full flex items-center justify-center font-semibold mb-3" style={{ background: "#FFF0EB", color: "#C03A08", width: top ? 84 : 64, height: top ? 84 : 64 }}>
        {r.name.split(" ").map((s) => s[0]).join("")}
      </div>
      <p className="font-semibold text-[15px]">{r.name}</p>
      <p className={`font-serif font-semibold ${top ? "text-[28px]" : "text-[20px]"} text-orange mt-1`}>{r.pts}</p>
      {top && <span className="pill pill-orange mt-2">Top Contributor</span>}
      <div
        className="w-full mt-4 rounded-t-[10px] flex items-start justify-center pt-3 text-white font-serif font-semibold"
        style={{ height: h, background: top ? "#E8490F" : "#F0C2A8", color: top ? "#fff" : "#7A3A1A" }}
      >
        #{r.rank}
      </div>
    </div>
  );
}
