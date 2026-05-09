import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { PageHeader } from "@/components/PageHeader";
import { useState } from "react";

export const Route = createFileRoute("/news")({ component: News });

const BRIEFS = [
  { id: 1, title: "Reliance Retail posts 18% revenue growth in Q3, signals aggressive expansion in quick commerce", domain: "Retail", source: "ET", why: "Retail growth cases and market entry questions frequently draw from Reliance's distribution moat.", read: false },
  { id: 2, title: "Crude oil falls below $75 as OPEC+ signals production increase in Q2", domain: "Macro", source: "Reuters", why: "Crude directly impacts India's CAD and inflation — a staple macro question in GD/PI rounds.", read: false },
  { id: 3, title: "Swiggy's food delivery losses narrow to Rs 625 Cr, Instamart GMV up 40%", domain: "Startup", source: "Mint", why: "Unit economics turnaround makes this a strong profitability case study.", read: false },
  { id: 4, title: "RBI holds repo rate at 6.5% for eighth consecutive meeting, signals rate cut in June", domain: "Policy", source: "Bloomberg", why: "Monetary policy transmission is a core macroeconomics concept tested in PI.", read: false },
  { id: 5, title: "Tata Motors demerger: CV and PV businesses to be separate listed entities", domain: "M&A", source: "Moneycontrol", why: "Corporate restructuring and demerger logic — frequently asked in strategy cases.", read: false },
  { id: 6, title: "Zomato acquires Paytm's events business for Rs 2,048 Cr, enters experiences market", domain: "M&A", source: "TechCrunch", why: "Platform adjacency and acquisition strategy — a BCG/Bain interview favorite.", read: false },
  { id: 7, title: "India's services PMI hits 14-month high at 61.7, manufacturing PMI at 56.5", domain: "Macro", source: "Reuters", why: "PMI data interpretation is a common GD topic and PI question.", read: false },
  { id: 8, title: "Hindustan Unilever launches direct-to-consumer brands, bypasses traditional retail", domain: "Strategy", source: "ET", why: "Channel disruption and DTC strategy — relevant for marketing and market entry cases.", read: false },
  { id: 9, title: "Apple reaches $3.5T market cap, AI integration drives iPhone upgrade cycle", domain: "Markets", source: "Bloomberg", why: "Platform ecosystem and pricing power — excellent for valuation discussions.", read: false },
  { id: 10, title: "India's FDI inflows drop 22% YoY, government announces PLI scheme 2.0", domain: "Policy", source: "Mint", why: "FDI trends and industrial policy are frequently tested in economics PI rounds.", read: false },
];

const DOMAINS = ["All", "Macro", "M&A", "Startup", "Policy", "Markets", "Retail", "Strategy"];

function News() {
  const [domain, setDomain] = useState("All");
  const [readSet, setReadSet] = useState<Set<number>>(new Set());

  const filtered = BRIEFS.filter(b => domain === "All" || b.domain === domain);
  const readCount = filtered.filter(b => readSet.has(b.id)).length;

  return (
    <PageShell>
      <PageHeader
        eyebrow="Daily Brief"
        title="Today's business intelligence."
        subtitle="5 curated stories. Each one annotated with why it matters for your MBA interviews."
      />
      <div className="mx-auto max-w-[1180px] px-5 md:px-6 -mt-4 pb-20">
        {/* Progress */}
        <div className="mb-8 card-base p-5 flex items-center justify-between" style={{ background: "#FFF7F3" }}>
          <div>
            <p className="text-[13px] font-semibold">Today's Reading Progress</p>
            <p className="text-[12px] text-text-muted mt-1">{readCount}/{filtered.length} articles read</p>
          </div>
          <div className="w-32 h-2 rounded-full bg-muted/60 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(readCount / Math.max(filtered.length, 1)) * 100}%`, background: "#E8490F" }} />
          </div>
        </div>

        {/* Domain filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {DOMAINS.map(d => (
            <button key={d} onClick={() => setDomain(d)} className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all ${domain === d ? "bg-orange text-white" : "bg-muted/40 text-text-muted hover:text-text-primary"}`}>{d}</button>
          ))}
        </div>

        {/* Articles */}
        <div className="space-y-4">
          {filtered.map(b => (
            <article key={b.id} className={`card-base p-6 transition-all ${readSet.has(b.id) ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="pill">{b.domain}</span>
                    <span className="text-[11px] text-text-muted">{b.source}</span>
                  </div>
                  <h3 className="text-[16px] font-semibold leading-[1.45] text-text-primary">{b.title}</h3>
                  <div className="mt-3 p-3 rounded-lg" style={{ background: "#FFF7F3" }}>
                    <p className="text-[12px] text-text-secondary leading-[1.6]">
                      <span className="font-semibold" style={{ color: "#E8490F" }}>Why it matters: </span>{b.why}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setReadSet(prev => { const s = new Set(prev); s.has(b.id) ? s.delete(b.id) : s.add(b.id); return s; })}
                  className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${readSet.has(b.id) ? "bg-orange border-orange text-white" : "border-border text-text-muted hover:border-orange"}`}
                  title={readSet.has(b.id) ? "Mark as unread" : "Mark as read"}
                >
                  {readSet.has(b.id) ? "✓" : ""}
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
