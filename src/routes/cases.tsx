import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { PageHeader } from "@/components/PageHeader";
import { GlowCard } from "@/components/GlowCard";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/cases")({ component: Cases });

interface CaseDeck {
  id: string;
  name: string;
  description?: string;
  category: string;
  source: string;
  file_type: string;
  file_url: string;
  downloads: number;
  added_date: string;
}

const FALLBACK: CaseDeck[] = [
  {
    id: "1",
    name: "Market Entry — Indian EV Two-Wheeler Segment",
    category: "Market Entry",
    source: "McKinsey Style",
    file_type: "PDF",
    file_url: "#",
    downloads: 234,
    added_date: "2025-01-15",
  },
  {
    id: "2",
    name: "Profitability Decline — Luxury Hotel Chain",
    category: "Profitability",
    source: "BCG Style",
    file_type: "PDF",
    file_url: "#",
    downloads: 189,
    added_date: "2025-01-12",
  },
  {
    id: "3",
    name: "Growth Strategy — EdTech Startup Series B",
    category: "Growth",
    source: "Bain Style",
    file_type: "PPTX",
    file_url: "#",
    downloads: 156,
    added_date: "2025-01-10",
  },
  {
    id: "4",
    name: "Pricing Strategy — Enterprise SaaS Product",
    category: "Pricing",
    source: "Deloitte Style",
    file_type: "PDF",
    file_url: "#",
    downloads: 142,
    added_date: "2025-01-08",
  },
  {
    id: "5",
    name: "M&A — Pharma Company Cross-Border Acquisition",
    category: "M&A",
    source: "Goldman Sachs",
    file_type: "PDF",
    file_url: "#",
    downloads: 128,
    added_date: "2025-01-05",
  },
  {
    id: "6",
    name: "Operations — Last-Mile Supply Chain Optimization",
    category: "Operations",
    source: "AT Kearney",
    file_type: "PDF",
    file_url: "#",
    downloads: 115,
    added_date: "2025-01-03",
  },
  {
    id: "7",
    name: "Digital Transformation — Tier-2 Banking",
    category: "Strategy",
    source: "Accenture",
    file_type: "PPTX",
    file_url: "#",
    downloads: 98,
    added_date: "2024-12-28",
  },
  {
    id: "8",
    name: "Revenue Growth — QSR Chain Expansion India",
    category: "Growth",
    source: "LEK Style",
    file_type: "PDF",
    file_url: "#",
    downloads: 87,
    added_date: "2024-12-25",
  },
  {
    id: "9",
    name: "Cost Reduction — FMCG Rural Distribution",
    category: "Profitability",
    source: "McKinsey Style",
    file_type: "PDF",
    file_url: "#",
    downloads: 76,
    added_date: "2024-12-22",
  },
  {
    id: "10",
    name: "New Product Launch — B2B Fintech Platform",
    category: "Market Entry",
    source: "BCG Style",
    file_type: "PDF",
    file_url: "#",
    downloads: 65,
    added_date: "2024-12-20",
  },
  {
    id: "11",
    name: "Turnaround — Declining Textile Manufacturer",
    category: "Profitability",
    source: "Oliver Wyman",
    file_type: "PDF",
    file_url: "#",
    downloads: 54,
    added_date: "2024-12-18",
  },
  {
    id: "12",
    name: "Market Sizing — EV Charging Stations in India",
    category: "Market Entry",
    source: "Bain Style",
    file_type: "PDF",
    file_url: "#",
    downloads: 48,
    added_date: "2024-12-15",
  },
];

const PER_PAGE = 9;
const CATEGORIES = [
  "All",
  "Market Entry",
  "Profitability",
  "Growth",
  "Pricing",
  "M&A",
  "Operations",
  "Strategy",
];

const difficultyMap: Record<string, { label: string; color: string }> = {
  "Market Entry": { label: "Medium", color: "#F59E0B" },
  Profitability: { label: "Easy", color: "#22C55E" },
  Growth: { label: "Medium", color: "#F59E0B" },
  Pricing: { label: "Hard", color: "#EF4444" },
  "M&A": { label: "Hard", color: "#EF4444" },
  Operations: { label: "Medium", color: "#F59E0B" },
  Strategy: { label: "Hard", color: "#EF4444" },
};

function Cases() {
  const { user, isMember } = useAuth();
  const navigate = useNavigate();
  const [decks, setDecks] = useState<CaseDeck[]>(FALLBACK);
  const [cat, setCat] = useState("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    supabase
      .from("case_decks")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) setDecks(data as CaseDeck[]);
      });
  }, []);

  const filtered = decks
    .filter((d) => cat === "All" || d.category === cat)
    .filter((d) => !search || d.name.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Case Library"
        title="Case deck repository."
        subtitle="Aggregated from top consulting firms, B-schools, and competitions. Download, practice, prepare."
      />
      <div className="mx-auto max-w-[1180px] px-5 md:px-6 -mt-4 pb-20">
        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { n: filtered.length, l: "Total Cases" },
            { n: "7+", l: "Domains" },
            { n: "1.2K+", l: "Downloads" },
          ].map((s, i) => (
            <div key={i} className="card-base p-4 text-center">
              <p
                className="text-[24px] font-bold"
                style={{ fontFamily: "var(--font-mono)", color: "#E8490F" }}
              >
                {s.n}
              </p>
              <p className="text-[11px] text-text-muted uppercase tracking-[0.08em] mt-1">{s.l}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search cases..."
            className="input-base flex-1 min-w-[200px] h-10 text-[13px]"
          />
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setCat(c);
                  setPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all ${cat === c ? "bg-orange text-white" : "bg-muted/40 text-text-muted hover:text-text-primary"}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Card grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {paged.map((d) => {
            const diff = difficultyMap[d.category] || { label: "Medium", color: "#F59E0B" };
            return (
              <GlowCard
                key={d.id}
                className={`p-5 flex flex-col cursor-pointer transition-all hover:scale-[1.02] ${
                  !(user && isMember) ? "hover:border-orange/50" : ""
                }`}
                onClick={() => {
                  if (!(user && isMember)) {
                    setShowLoginModal(true);
                    return;
                  }
                  sessionStorage.setItem(`constrat:case:${d.id}`, JSON.stringify({ name: d.name, description: d.description || d.name, category: d.category, source: d.source }));
                  navigate({ to: "/case/$caseId", params: { caseId: d.id } });
                }}
              >
                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-3">
                    <span className="pill pill-orange">{d.category}</span>
                    <span
                      className="pill"
                      style={{ background: `${diff.color}15`, color: diff.color }}
                    >
                      {diff.label}
                    </span>
                  </div>
                  <h3 className="text-[15px] font-semibold leading-[1.4] text-text-primary flex-1">
                    {d.name}
                  </h3>
                  <div className="mt-4 pt-3 border-t border-border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] text-text-muted">{d.source}</p>
                        <p className="text-[11px] text-text-muted mt-0.5">
                          {d.file_type} · {d.downloads} downloads
                        </p>
                      </div>
                      {user && isMember ? (
                        d.file_url && d.file_url !== "#" ? (
                          <a
                            href={d.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-primary text-[12px] h-8 px-4"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Download
                          </a>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              sessionStorage.setItem(`constrat:case:${d.id}`, JSON.stringify({ name: d.name, description: d.description || d.name, category: d.category, source: d.source }));
                              navigate({ to: "/case/$caseId", params: { caseId: d.id } });
                            }}
                            className="btn-primary text-[12px] h-8 px-4"
                          >
                            Solve
                          </button>
                        )
                      ) : (
                        <div className="text-[12px] text-text-muted">Login to access</div>
                      )}
                    </div>
                  </div>
                </div>
              </GlowCard>
            );
          })}
        </div>
        {paged.length === 0 && (
          <p className="text-center text-text-muted py-16 text-[14px]">
            No cases match your filters.
          </p>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-10 flex items-center justify-between">
            <p className="text-[13px] text-text-muted">
              Page {page} of {totalPages} ({filtered.length} cases)
            </p>
            <div className="flex gap-1">
              {page > 1 && (
                <button
                  onClick={() => setPage(page - 1)}
                  className="w-9 h-9 rounded-md border border-border text-[13px]"
                >
                  ←
                </button>
              )}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className="w-9 h-9 rounded-md border border-border text-[13px]"
                  style={
                    n === page
                      ? { background: "#E8490F", color: "#fff", borderColor: "#E8490F" }
                      : {}
                  }
                >
                  {n}
                </button>
              ))}
              {page < totalPages && (
                <button
                  onClick={() => setPage(page + 1)}
                  className="w-9 h-9 rounded-md border border-border text-[13px]"
                >
                  →
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-orange/10 flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-orange"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h2 className="text-[24px] font-semibold mb-2">Access Required</h2>
              <p className="text-[14px] text-text-secondary mb-6 leading-[1.5]">
                Join Constrat to access our case library, submit solutions, and track your progress.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowLoginModal(false);
                    navigate({ to: "/join" });
                  }}
                  className="w-full h-11 flex items-center justify-center bg-orange text-white rounded-lg text-[14px] font-semibold hover:bg-orange-hover transition-colors"
                >
                  Join Constrat
                </button>
                <button
                  onClick={() => {
                    setShowLoginModal(false);
                    navigate({ to: "/login" });
                  }}
                  className="w-full h-11 flex items-center justify-center border border-border rounded-lg text-[14px] font-medium hover:border-orange hover:text-orange transition-colors"
                >
                  Already have an account? Login
                </button>
              </div>
              <button
                onClick={() => setShowLoginModal(false)}
                className="absolute top-4 right-4 text-text-muted hover:text-text-primary"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
