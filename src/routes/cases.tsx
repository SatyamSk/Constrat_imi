import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { PageShell, PageHeader } from "@/components/PageShell";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/cases")({
  component: Cases,
  head: () => ({
    meta: [
      { title: "Case Repository — Constrat" },
      { name: "description", content: "120+ case decks. Search, filter, download." },
    ],
  }),
});

const CATS = ["All", "Consulting Frameworks", "Competition Decks", "Industry Primers", "McKinsey", "BCG", "Bain", "Deloitte", "Student Decks", "Excel Models", "PPT Templates"];
const TYPES = ["PDF", "PPTX", "XLSX"];
const PER_PAGE = 9;

const DECKS = [
  { name: "MECE & Issue Trees — A Pragmatic Guide", desc: "Structured frameworks for cracking ambiguous business problems.", cat: "Consulting Frameworks", src: "Constrat Internal", type: "PDF", date: "Mar 2025", dl: 412 },
  { name: "BCG Growth-Share Matrix Refresher", desc: "Application notes with 6 worked Indian-market examples.", cat: "BCG", src: "BCG Public", type: "PPTX", date: "Feb 2025", dl: 287 },
  { name: "IIM-A Confluence 2024 — Winning Deck", desc: "Quick-commerce profitability case, 1st place national finals.", cat: "Competition Decks", src: "IIM-A 2024", type: "PPTX", date: "Dec 2024", dl: 612 },
  { name: "FMCG Industry Primer — India 2025", desc: "Volume vs value growth, channel mix, premiumisation trends.", cat: "Industry Primers", src: "Constrat Research", type: "PDF", date: "Apr 2025", dl: 198 },
  { name: "McKinsey Profitability Tree — Practice Pack", desc: "12 worked cases with marker comments.", cat: "McKinsey", src: "McKinsey Public", type: "PDF", date: "Jan 2025", dl: 533 },
  { name: "Excel Model — DCF for Startups", desc: "Reusable template, 3-statement linked, sensitivity tables.", cat: "Excel Models", src: "Constrat Internal", type: "XLSX", date: "Mar 2025", dl: 318 },
  { name: "Bain Capability Sourcing Framework", desc: "Operations restructuring playbook with two case examples.", cat: "Bain", src: "Bain Public", type: "PDF", date: "Feb 2025", dl: 154 },
  { name: "Deloitte Digital Maturity Model", desc: "Diagnostic + scoring rubric, ready-to-adapt PPT.", cat: "Deloitte", src: "Deloitte Public", type: "PPTX", date: "Nov 2024", dl: 221 },
  { name: "Tata Crucible 2023 — Strategy Deck", desc: "Auto-OEM EV transition, 2nd place nationals.", cat: "Student Decks", src: "IIM-B 2023", type: "PPTX", date: "Sep 2023", dl: 178 },
];

type Deck = { name: string; desc: string; cat: string; src: string; type: string; date: string; dl: number; url?: string };

function Cases() {
  const [cat, setCat] = useState("All");
  const [type, setType] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("downloads");
  const [page, setPage] = useState(1);
  const [dbDecks, setDbDecks] = useState<Deck[]>([]);

  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      supabase.from("case_decks").select("*").order("created_at", { ascending: false }).then(({ data }) => {
        if (data) {
          setDbDecks(data.map((d: Record<string, unknown>) => ({
            name: d.name as string, desc: (d.description as string) || "",
            cat: (d.category as string) || "General", src: (d.source as string) || "Upload",
            type: (d.file_type as string) || "PDF", date: (d.added_date as string) || "Recent",
            dl: (d.downloads as number) || 0, url: (d.file_url as string) || "",
          })));
        }
      });
    }
  }, []);

  const allDecks = [...dbDecks, ...(dbDecks.length > 0 ? [] : DECKS)];

  const filtered = useMemo(() => {
    let result = allDecks.filter((d) => {
      if (cat !== "All" && d.cat !== cat && d.src && !d.src.includes(cat)) return false;
      if (type && d.type !== type) return false;
      if (q && !(d.name + d.desc).toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
    if (sort === "downloads") result.sort((a, b) => b.dl - a.dl);
    else if (sort === "newest") result.sort((a, b) => b.date.localeCompare(a.date));
    else if (sort === "az") result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [allDecks, cat, type, q, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [cat, type, q, sort]);

  return (
    <PageShell>
      <PageHeader eyebrow="Case Repository" title="120+ case decks. Search. Download. Win." subtitle="McKinsey, BCG, Bain, Deloitte, student competition decks — all in one place." alt>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-text-secondary">
          <span><b className="text-text-primary">{allDecks.length}</b> Decks</span>
          <span><b className="text-text-primary">{CATS.length - 1}</b> Categories</span>
          <span>Updated by Constrat team</span>
        </div>
      </PageHeader>

      <div className="sticky top-16 z-30 bg-surface border-b border-border">
        <div className="mx-auto max-w-[1180px] px-6 py-4 flex flex-wrap items-center gap-4">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search case decks, companies, topics…" className="input-base w-full md:w-[360px]" />
          <div className="flex gap-1.5 flex-wrap">
            {TYPES.map((t) => (
              <button key={t} onClick={() => setType(type === t ? null : t)}
                className="px-3 h-7 rounded-full text-[11px] border font-semibold tracking-wide"
                style={type === t ? { background: "#E8490F", color: "#fff", borderColor: "#E8490F" } : { background: "#fff", borderColor: "#E8E4DE", color: "#5C5C5A" }}
              >{t}</button>
            ))}
          </div>
          <select value={sort} onChange={e => setSort(e.target.value)} className="input-base ml-auto w-[180px]">
            <option value="downloads">Most Downloaded</option>
            <option value="newest">Newest</option>
            <option value="az">A–Z</option>
          </select>
        </div>
        <div className="mx-auto max-w-[1180px] px-6 pb-4 flex gap-1.5 flex-wrap">
          {CATS.map((c) => (
            <button key={c} onClick={() => setCat(c)}
              className="px-3 h-7 rounded-full text-[12px] border transition-colors"
              style={cat === c ? { background: "#E8490F", color: "#fff", borderColor: "#E8490F" } : { background: "#fff", color: "#5C5C5A", borderColor: "#E8E4DE" }}
            >{c}</button>
          ))}
        </div>
      </div>

      <section className="bg-background">
        <div className="mx-auto max-w-[1180px] px-6 py-12">
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {paged.map((d, i) => (
              <article key={i} className="card-base p-6 relative">
                <span className="absolute top-5 right-5 pill"
                  style={d.type === "PDF" ? { background: "#FFF0F0", color: "#B91C1C" } : d.type === "PPTX" ? { background: "#FFF3E8", color: "#C2570A" } : { background: "#EDFAF3", color: "#1E6640" }}
                >{d.type}</span>
                <h3 className="text-[17px] font-semibold leading-[1.35] pr-12">{d.name}</h3>
                <p className="mt-2 text-[13px] text-text-secondary leading-[1.55] line-clamp-2">{d.desc}</p>
                <div className="mt-4 flex gap-2 flex-wrap">
                  <span className="pill">{d.cat}</span><span className="pill">{d.src}</span>
                </div>
                <p className="mt-4 text-[12px] text-text-muted">Added {d.date}</p>
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-[12px] text-text-muted">{d.dl} downloads</span>
                  {d.url ? (
                    <a href={d.url} target="_blank" rel="noopener noreferrer" className="btn-ghost text-[13px]">Download &rarr;</a>
                  ) : (
                    <button className="btn-ghost text-[13px]" onClick={() => alert(`"${d.name}" will be available for download once uploaded via Admin Panel.`)}>Download &rarr;</button>
                  )}
                </div>
              </article>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-12 flex items-center justify-between">
              <p className="text-[13px] text-text-muted">Showing {(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE, filtered.length)} of {filtered.length}</p>
              <div className="flex gap-1">
                {page > 1 && <button onClick={() => setPage(page-1)} className="w-9 h-9 rounded-md border border-border text-[13px]">←</button>}
                {Array.from({length: totalPages}, (_, i) => i+1).map(n => (
                  <button key={n} onClick={() => setPage(n)}
                    className="w-9 h-9 rounded-md border border-border text-[13px]"
                    style={n === page ? { background: "#E8490F", color: "#fff", borderColor: "#E8490F" } : {}}
                  >{n}</button>
                ))}
                {page < totalPages && <button onClick={() => setPage(page+1)} className="w-9 h-9 rounded-md border border-border text-[13px]">→</button>}
              </div>
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}
