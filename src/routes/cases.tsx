import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { PageHeader } from "@/components/PageHeader";
import { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/cases")({ component: Cases });

interface CaseDeck {
  id: string;
  name: string;
  category: string;
  source: string;
  file_type: string;
  file_url: string;
  downloads: number;
  added_date: string;
}

const FALLBACK: CaseDeck[] = [
  { id: "1", name: "Market Entry - Indian EV Two-Wheeler", category: "Market Entry", source: "McKinsey Style", file_type: "PDF", file_url: "#", downloads: 234, added_date: "2025-01-15" },
  { id: "2", name: "Profitability Decline - Luxury Hotel Chain", category: "Profitability", source: "BCG Style", file_type: "PDF", file_url: "#", downloads: 189, added_date: "2025-01-12" },
  { id: "3", name: "Growth Strategy - EdTech Startup", category: "Growth", source: "Bain Style", file_type: "PPTX", file_url: "#", downloads: 156, added_date: "2025-01-10" },
  { id: "4", name: "Pricing Strategy - SaaS Product", category: "Pricing", source: "Deloitte Style", file_type: "PDF", file_url: "#", downloads: 142, added_date: "2025-01-08" },
  { id: "5", name: "M&A - Pharma Company Acquisition", category: "M&A", source: "Goldman Sachs", file_type: "PDF", file_url: "#", downloads: 128, added_date: "2025-01-05" },
  { id: "6", name: "Operations - Supply Chain Optimization", category: "Operations", source: "AT Kearney", file_type: "PDF", file_url: "#", downloads: 115, added_date: "2025-01-03" },
  { id: "7", name: "Digital Transformation - Banking", category: "Strategy", source: "Accenture", file_type: "PPTX", file_url: "#", downloads: 98, added_date: "2024-12-28" },
  { id: "8", name: "Revenue Growth - QSR Chain India", category: "Growth", source: "LEK Style", file_type: "PDF", file_url: "#", downloads: 87, added_date: "2024-12-25" },
  { id: "9", name: "Cost Reduction - FMCG Distribution", category: "Profitability", source: "McKinsey Style", file_type: "PDF", file_url: "#", downloads: 76, added_date: "2024-12-22" },
  { id: "10", name: "New Product Launch - Fintech", category: "Market Entry", source: "BCG Style", file_type: "PDF", file_url: "#", downloads: 65, added_date: "2024-12-20" },
];

const PER_PAGE = 10;
const CATEGORIES = ["All", "Market Entry", "Profitability", "Growth", "Pricing", "M&A", "Operations", "Strategy"];
const TYPES = ["All", "PDF", "PPTX", "XLSX"];

function Cases() {
  const [decks, setDecks] = useState<CaseDeck[]>(FALLBACK);
  const [cat, setCat] = useState("All");
  const [type, setType] = useState("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<"downloads"|"added_date">("downloads");

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    supabase.from("case_decks").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      if (data && data.length > 0) setDecks(data as CaseDeck[]);
    });
  }, []);

  const filtered = decks
    .filter(d => cat === "All" || d.category === cat)
    .filter(d => type === "All" || d.file_type === type)
    .filter(d => !search || d.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sort === "downloads" ? b.downloads - a.downloads : b.added_date.localeCompare(a.added_date));

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Case Library"
        title="Case deck repository."
        subtitle="Aggregated cases from top consulting firms, B-schools, and competitions. Download, practice, prepare."
      />
      <div className="mx-auto max-w-[1180px] px-5 md:px-6 -mt-4 pb-20">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search cases..."
            className="input-base w-full md:w-[260px] h-10 text-[13px]"
          />
          <select value={cat} onChange={e => { setCat(e.target.value); setPage(1); }} className="input-base h-10 text-[13px] w-auto">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={type} onChange={e => { setType(e.target.value); setPage(1); }} className="input-base h-10 text-[13px] w-auto">
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={sort} onChange={e => setSort(e.target.value as "downloads"|"added_date")} className="input-base h-10 text-[13px] w-auto">
            <option value="downloads">Most Downloaded</option>
            <option value="added_date">Recently Added</option>
          </select>
        </div>

        {/* Table */}
        <div className="card-base overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr style={{ background: "#F9F8F6" }}>
                <th className="text-left text-[11px] uppercase tracking-[0.08em] font-semibold text-text-muted py-3 px-4">Case Title</th>
                <th className="text-left text-[11px] uppercase tracking-[0.08em] font-semibold text-text-muted py-3 px-4">Domain</th>
                <th className="text-left text-[11px] uppercase tracking-[0.08em] font-semibold text-text-muted py-3 px-4">Firm Type</th>
                <th className="text-center text-[11px] uppercase tracking-[0.08em] font-semibold text-text-muted py-3 px-4">Format</th>
                <th className="text-center text-[11px] uppercase tracking-[0.08em] font-semibold text-text-muted py-3 px-4">Downloads</th>
                <th className="text-right text-[11px] uppercase tracking-[0.08em] font-semibold text-text-muted py-3 px-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(d => (
                <tr key={d.id} className="border-t border-border hover:bg-orange-tint/20 transition-colors">
                  <td className="py-3.5 px-4">
                    <p className="text-[14px] font-semibold text-text-primary">{d.name}</p>
                    <p className="text-[11px] text-text-muted mt-0.5">Added {d.added_date}</p>
                  </td>
                  <td className="py-3.5 px-4"><span className="pill">{d.category}</span></td>
                  <td className="py-3.5 px-4 text-[13px] text-text-secondary">{d.source}</td>
                  <td className="py-3.5 px-4 text-center"><span className="pill pill-orange">{d.file_type}</span></td>
                  <td className="py-3.5 px-4 text-center text-[13px]" style={{ fontFamily: "var(--font-mono)" }}>{d.downloads}</td>
                  <td className="py-3.5 px-4 text-right">
                    {d.file_url && d.file_url !== "#" ? (
                      <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="btn-ghost text-[12px]">Download</a>
                    ) : (
                      <span className="text-[12px] text-text-muted">Login required</span>
                    )}
                  </td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr><td colSpan={6} className="py-12 text-center text-text-muted text-[14px]">No cases match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-[13px] text-text-muted">Showing {(page-1)*PER_PAGE+1}-{Math.min(page*PER_PAGE, filtered.length)} of {filtered.length}</p>
            <div className="flex gap-1">
              {page > 1 && <button onClick={() => setPage(page-1)} className="w-9 h-9 rounded-md border border-border text-[13px]">←</button>}
              {Array.from({length: totalPages}, (_, i) => i+1).map(n => (
                <button key={n} onClick={() => setPage(n)} className="w-9 h-9 rounded-md border border-border text-[13px]" style={n === page ? { background: "#E8490F", color: "#fff", borderColor: "#E8490F" } : {}}>{n}</button>
              ))}
              {page < totalPages && <button onClick={() => setPage(page+1)} className="w-9 h-9 rounded-md border border-border text-[13px]">→</button>}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
