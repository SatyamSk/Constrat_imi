import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell, PageHeader } from "@/components/PageShell";

export const Route = createFileRoute("/news")({
  component: News,
});

const TOPICS = ["All", "Markets & Economy", "Policy & Regulation", "Startups & VC", "FMCG & Retail", "Consulting Industry", "Global Business", "India Focus"];

const NEWS = [
  { src: "Reuters", topic: "Markets & Economy", title: "RBI holds repo rate at 6.5%, signals cautious stance on inflation.", time: "2 hours ago", read: "2 min", url: "https://www.reuters.com/world/india/", sum: ["MPC unchanged 5\u20131; food inflation flagged.", "Bond yields unchanged; INR steady at 83.4.", "Watch: stance shift expected by Q3."] },
  { src: "Economic Times", topic: "Startups & VC", title: "Zepto closes $665M round, valuation crosses $5B.", time: "3 hours ago", read: "3 min", url: "https://economictimes.indiatimes.com/tech/startups", sum: ["Existing investors led; pre-IPO positioning.", "Quick-commerce GMV race intensifies.", "Profitability path remains the open question."] },
  { src: "Bloomberg", topic: "Global Business", title: "Apple shifts ~25% of iPhone production to India by 2026.", time: "5 hours ago", read: "4 min", url: "https://www.bloomberg.com/asia", sum: ["Foxconn + Tata as anchor partners.", "Geo-diversification away from China accelerates.", "PLI scheme cited as decisive."] },
  { src: "Financial Times", topic: "Consulting Industry", title: "McKinsey to cut ~3% of senior consultants amid demand softening.", time: "Yesterday", read: "3 min", url: "https://www.ft.com/consulting", sum: ["Tech and FS practices most affected.", "AI-led delivery models reshape staffing.", "Hiring at junior levels stays steady."] },
  { src: "Mint", topic: "FMCG & Retail", title: "HUL reports flat volume growth, premium portfolio outpaces.", time: "Yesterday", read: "2 min", url: "https://www.livemint.com/companies", sum: ["Premium portfolio +8% YoY.", "Rural demand recovery still patchy.", "Pricing actions paused for Q2."] },
  { src: "Economic Times", topic: "Policy & Regulation", title: "Centre tightens UPI MDR debate; banks push back.", time: "2 days ago", read: "3 min", url: "https://economictimes.indiatimes.com/industry/banking", sum: ["Zero-MDR cost burden in spotlight.", "Banks seek calibrated revenue model.", "Final policy view expected by Q3."] },
];

function News() {
  const [topic, setTopic] = useState("All");
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const filtered = NEWS.filter((n) => topic === "All" || n.topic === topic);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Daily Business News"
        title="Everything you need to know before your interview."
        subtitle="Curated news for IMI students. AI-summarized for speed."
      >
        <div className="inline-flex items-center gap-2 text-[13px] text-text-secondary">
          <span className="pulse-dot" />
          Updated daily
        </div>
      </PageHeader>

      <div className="sticky top-16 z-30 bg-surface border-b border-border">
        <div className="mx-auto max-w-[1180px] px-6 flex gap-1 overflow-x-auto">
          {TOPICS.map((t) => (
            <button
              key={t}
              onClick={() => setTopic(t)}
              className="relative py-4 px-3 text-[13px] font-medium whitespace-nowrap"
              style={{ color: topic === t ? "#E8490F" : "#5C5C5A" }}
            >
              {t}
              {topic === t && <span className="absolute left-2 right-2 -bottom-px h-0.5 bg-orange" />}
            </button>
          ))}
        </div>
      </div>

      <section className="bg-background">
        <div className="mx-auto max-w-[1180px] px-6 py-12">
          {/* Top Story */}
          <article className="card-base overflow-hidden grid md:grid-cols-[1.4fr_1fr]">
            <div className="p-8">
              <div className="flex gap-2">
                <span className="pill">Markets &amp; Economy</span>
                <span className="pill pill-orange">Top Story</span>
              </div>
              <h2 className="mt-4 font-serif text-[32px] leading-[1.15] text-text-primary">
                RBI holds repo rate at 6.5%, signals cautious stance on inflation.
              </h2>
              <p className="mt-3 text-[16px] text-text-secondary">Reuters &middot; 2 hours ago</p>
              <div className="mt-6">
                <span className="label-orange">AI Summary</span>
                <ul className="mt-3 space-y-2 text-[14px] text-text-secondary">
                  <li>&middot; MPC unchanged 5&ndash;1, with food inflation flagged as the dominant risk.</li>
                  <li>&middot; Bond yields unchanged; INR steady at 83.4 to USD.</li>
                  <li>&middot; Watch: stance shift expected by Q3, conditional on monsoon and food prices.</li>
                </ul>
              </div>
              <a href="https://www.reuters.com/world/india/" target="_blank" rel="noopener noreferrer" className="btn-primary mt-7 inline-flex">
                Read full story &rarr;
              </a>
            </div>
            <div
              className="hidden md:block"
              style={{
                background: "linear-gradient(135deg, #FFB58A 0%, #E8490F 70%, #C03A08 100%)",
              }}
            />
          </article>

          <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((n, i) => (
              <article key={i} className="card-base p-6 relative">
                <p className="text-[11px] uppercase tracking-[0.08em] text-text-muted">{n.src}</p>
                <h3 className="mt-3 text-[16px] font-semibold leading-[1.45] pr-6">{n.title}</h3>
                <button
                  onClick={() => setOpenIdx(openIdx === i ? null : i)}
                  className="mt-3 text-[12px] font-medium text-orange"
                >
                  Summary {openIdx === i ? "\u25B4" : "\u25BE"}
                </button>
                <div
                  className="overflow-hidden transition-all"
                  style={{ maxHeight: openIdx === i ? 200 : 24 }}
                >
                  {openIdx === i ? (
                    <ul className="mt-2 space-y-1 text-[13px] text-text-secondary">
                      {n.sum.map((s, j) => <li key={j}>&middot; {s}</li>)}
                    </ul>
                  ) : (
                    <p className="mt-2 text-[13px] text-text-secondary line-clamp-1 italic">{n.sum[0]}</p>
                  )}
                </div>
                <div className="mt-4 flex gap-2">
                  <span className="pill">{n.topic}</span>
                  <span className="pill">{n.read}</span>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[12px] text-text-muted">{n.time}</span>
                  <a href={n.url} target="_blank" rel="noopener noreferrer" className="btn-ghost text-[13px]">Read &rarr;</a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* GD Prep */}
      <section style={{ background: "#FFF7F3" }}>
        <div className="mx-auto max-w-[1180px] px-6 py-[100px]">
          <span className="label-orange">GD Prep</span>
          <h2 className="mt-4 font-serif text-[36px] font-semibold leading-[1.1] tracking-[-0.025em]">
            Today&apos;s GD topics from the news.
          </h2>
          <div className="mt-10 grid md:grid-cols-3 gap-6">
            {[
              { t: "Should the RBI prioritise growth over inflation in the next cycle?", w: "Tied to today's policy stance \u2014 directly testable in BFSI and consulting interviews." },
              { t: "Is quick-commerce a profitable model or a VC-fueled mirage?", w: "Zepto's $665M round reopens the unit-economics debate." },
              { t: "Will Apple's India shift make us a manufacturing hub or just an assembler?", w: "PLI's effectiveness vs deeper supply-chain depth." },
            ].map((g) => (
              <div key={g.t} className="card-base p-6">
                <p className="text-[17px] font-semibold leading-[1.4]">{g.t}</p>
                <p className="mt-3 text-[14px] text-text-secondary">{g.w}</p>
                <div className="mt-4 flex gap-2">
                  <span className="pill">For</span>
                  <span className="pill">Against</span>
                  <span className="pill">Neutral angle</span>
                </div>
                <Link to="/practice" className="btn-ghost text-[13px] mt-5 inline-block">Practice this GD &rarr;</Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
