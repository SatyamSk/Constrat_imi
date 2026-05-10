import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { PageHeader } from "@/components/PageHeader";
import { GlowCard } from "@/components/GlowCard";
import { AnimatedSection } from "@/components/AnimatedSection";
import { useState } from "react";

export const Route = createFileRoute("/news")({ component: News });

const BRIEFS = [
  {
    id: 1,
    title:
      "Reliance Retail posts 18% revenue growth in Q3, signals aggressive expansion in quick commerce",
    domain: "Retail",
    source: "ET",
    why: "Retail growth cases and market entry questions frequently draw from Reliance's distribution moat.",
  },
  {
    id: 2,
    title: "Crude oil falls below $75 as OPEC+ signals production increase in Q2",
    domain: "Macro",
    source: "Reuters",
    why: "Crude directly impacts India's CAD and inflation — a staple macro question in GD/PI rounds.",
  },
  {
    id: 3,
    title: "Swiggy's food delivery losses narrow to Rs 625 Cr, Instamart GMV up 40%",
    domain: "Startup",
    source: "Mint",
    why: "Unit economics turnaround makes this a strong profitability case study.",
  },
  {
    id: 4,
    title: "RBI holds repo rate at 6.5% for eighth consecutive meeting, signals rate cut in June",
    domain: "Policy",
    source: "Bloomberg",
    why: "Monetary policy transmission is a core macroeconomics concept tested in PI.",
  },
  {
    id: 5,
    title: "Tata Motors demerger: CV and PV businesses to be separate listed entities",
    domain: "M&A",
    source: "Moneycontrol",
    why: "Corporate restructuring and demerger logic — frequently asked in strategy cases.",
  },
  {
    id: 6,
    title: "Zomato acquires Paytm's events business for Rs 2,048 Cr",
    domain: "M&A",
    source: "TechCrunch",
    why: "Platform adjacency and acquisition strategy — a BCG/Bain interview favorite.",
  },
  {
    id: 7,
    title: "India's services PMI hits 14-month high at 61.7, manufacturing PMI at 56.5",
    domain: "Macro",
    source: "Reuters",
    why: "PMI data interpretation is a common GD topic and PI question.",
  },
  {
    id: 8,
    title: "Hindustan Unilever launches direct-to-consumer brands, bypasses traditional retail",
    domain: "Strategy",
    source: "ET",
    why: "Channel disruption and DTC strategy — relevant for marketing and market entry cases.",
  },
];

const DOMAIN_COLORS: Record<string, string> = {
  Macro: "#3B82F6",
  "M&A": "#8B5CF6",
  Startup: "#22C55E",
  Policy: "#F59E0B",
  Retail: "#E8490F",
  Strategy: "#EC4899",
  Markets: "#06B6D4",
};
const DOMAINS = ["All", ...Object.keys(DOMAIN_COLORS)];

function News() {
  const [domain, setDomain] = useState("All");
  const [readSet, setReadSet] = useState<Set<number>>(new Set());
  const filtered = BRIEFS.filter((b) => domain === "All" || b.domain === domain);
  const readCount = filtered.filter((b) => readSet.has(b.id)).length;
  const toggleRead = (id: number) =>
    setReadSet((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });

  return (
    <PageShell>
      <PageHeader
        eyebrow="Daily Brief"
        title="Today's business intelligence."
        subtitle="Curated stories annotated with why they matter for your MBA interviews."
      />
      <div className="mx-auto max-w-[1180px] px-5 md:px-6 -mt-4 pb-20">
        {/* Today's featured + progress */}
        <div className="grid lg:grid-cols-[2fr_1fr] gap-5 mb-10">
          <GlowCard className="p-0 overflow-hidden" style={{ background: "#1A1A1A" }}>
            <div className="relative z-10">
              <div className="absolute inset-0 z-0" style={{ background: "radial-gradient(ellipse at 70% 20%, rgba(232,73,15,0.15), transparent 60%), #1A1A1A" }} />
              <div className="relative z-10 p-6 md:p-8 flex flex-col justify-end min-h-[260px]">
                <span
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold w-fit"
                  style={{ background: "rgba(232,73,15,0.15)", color: "#FF8C42" }}
                >
                  <span
                    className="pulse-dot"
                    style={{ background: "#FF8C42", boxShadow: "0 0 0 0 rgba(255,140,66,0.5)" }}
                  />{" "}
                  Featured Story
                </span>
                <h3
                  className="mt-4 text-[22px] md:text-[26px] font-serif leading-[1.3]"
                  style={{ color: "#F4ECE2" }}
                >
                  {BRIEFS[0].title}
                </h3>
                <p className="mt-3 text-[13px] leading-[1.65]" style={{ color: "#999" }}>
                  {BRIEFS[0].why}
                </p>
                <div className="mt-5 flex items-center gap-3">
                  <span
                    className="pill"
                    style={{
                      background: `${DOMAIN_COLORS[BRIEFS[0].domain]}20`,
                      color: DOMAIN_COLORS[BRIEFS[0].domain],
                    }}
                  >
                    {BRIEFS[0].domain}
                  </span>
                  <span className="text-[11px]" style={{ color: "#666" }}>
                    Source: {BRIEFS[0].source}
                  </span>
                </div>
              </div>
            </div>
          </GlowCard>
          <div
            className="card-base p-6 flex flex-col justify-between"
            style={{ background: "#FFF7F3" }}
          >
            <div>
              <p className="text-[11px] uppercase tracking-[0.08em] font-semibold text-text-muted mb-3">
                Today's Progress
              </p>
              <p
                className="text-[48px] font-bold leading-none"
                style={{ fontFamily: "var(--font-mono)", color: "#E8490F" }}
              >
                {readCount}
                <span className="text-[20px] text-text-muted">/{filtered.length}</span>
              </p>
              <p className="text-[13px] text-text-secondary mt-1">articles read</p>
            </div>
            <div className="mt-4">
              <div className="w-full h-2.5 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(readCount / Math.max(filtered.length, 1)) * 100}%`,
                    background: "linear-gradient(90deg, #E8490F, #FF8C42)",
                  }}
                />
              </div>
              <p className="text-[11px] text-text-muted mt-2">
                {readCount === filtered.length
                  ? "All done! Great prep today."
                  : `${filtered.length - readCount} more to complete today's brief`}
              </p>
            </div>
          </div>
        </div>

        {/* Domain pills */}
        <div className="flex flex-wrap gap-2 mb-8">
          {DOMAINS.map((d) => (
            <button
              key={d}
              onClick={() => setDomain(d)}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all ${domain === d ? "bg-orange text-white" : "bg-muted/40 text-text-muted hover:text-text-primary"}`}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Article cards */}
        <div className="space-y-4">
          {filtered.map((b, i) => (
            <AnimatedSection key={b.id} delay={i * 50}>
              <div
                className={`card-base p-5 md:p-6 flex gap-5 transition-all ${readSet.has(b.id) ? "opacity-50" : ""}`}
              >
                <div
                  className="shrink-0 w-1 rounded-full"
                  style={{ background: DOMAIN_COLORS[b.domain] || "#E8490F" }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="pill"
                      style={{
                        background: `${DOMAIN_COLORS[b.domain] || "#E8490F"}12`,
                        color: DOMAIN_COLORS[b.domain] || "#E8490F",
                      }}
                    >
                      {b.domain}
                    </span>
                    <span className="text-[11px] text-text-muted">{b.source}</span>
                  </div>
                  <h3 className="text-[15px] font-semibold leading-[1.45] text-text-primary">
                    {b.title}
                  </h3>
                  <div className="mt-3 p-3 rounded-lg" style={{ background: "#FFF7F3" }}>
                    <p className="text-[12px] text-text-secondary leading-[1.6]">
                      <span className="font-semibold" style={{ color: "#E8490F" }}>
                        Why it matters:{" "}
                      </span>
                      {b.why}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => toggleRead(b.id)}
                  className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all self-start mt-1 ${readSet.has(b.id) ? "bg-orange border-orange text-white" : "border-border text-text-muted hover:border-orange hover:text-orange"}`}
                >
                  {readSet.has(b.id) && (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
