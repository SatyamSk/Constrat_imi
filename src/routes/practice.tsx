import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/practice")({
  component: Practice,
  head: () => ({
    meta: [
      { title: "Practice — Constrat" },
      {
        name: "description",
        content:
          "Daily case questions, ranked case library, guesstimates and frameworks.",
      },
    ],
  }),
});

const TYPES = ["All", "Case", "Guesstimate", "Interview Q", "GD Topic"];
const FUNCTIONS = ["All", "Marketing", "Finance", "Operations", "Consulting", "HR", "Strategy"];
const DIFFS = ["All", "Easy", "Medium", "Hard"];

interface Question {
  type: string;
  q: string;
  fn: string;
  diff: string;
  src: string;
}
interface CaseDeck {
  id: string;
  name: string;
  category: string;
  source: string;
  description?: string;
}

const FALLBACK: Question[] = [
  { type: "GUESSTIMATE", q: "Estimate the daily revenue of all auto-rickshaws in Bengaluru.", fn: "Operations",  diff: "Medium", src: "Reported · MBB" },
  { type: "CASE",        q: "A regional dairy brand is losing share to D2C startups in Tier-1. Diagnose and recommend.", fn: "Marketing", diff: "Hard", src: "Competition" },
  { type: "GUESSTIMATE", q: "Size the Indian premium pet food market by 2027.", fn: "Strategy", diff: "Medium", src: "Reported · Bain" },
  { type: "CASE",        q: "A mid-sized pharma distributor has seen EBITDA drop from 18% to 11% in 18 months.", fn: "Consulting", diff: "Hard", src: "AI Generated" },
  { type: "INTERVIEW Q", q: "Tell me about a time you had to challenge consensus.", fn: "HR", diff: "Easy", src: "Reported · McKinsey" },
  { type: "GD TOPIC",    q: "Is quick commerce destroying India's kirana economy?", fn: "Strategy", diff: "Medium", src: "Custom" },
];

function Practice() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>(FALLBACK);
  const [library, setLibrary] = useState<CaseDeck[]>([]);
  const [todays, setTodays] = useState<Question | null>(null);
  const [tab, setTab] = useState("All");
  const [fn, setFn] = useState("All");
  const [diff, setDiff] = useState("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    let cancelled = false;
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [{ data: q }, { data: c }] = await Promise.all([
        supabase
          .from("practice_questions")
          .select("type, question, function, difficulty, source, date_assigned")
          .order("date_assigned", { ascending: false })
          .limit(80),
        supabase
          .from("case_decks")
          .select("id, name, category, source, description")
          .order("created_at", { ascending: false })
          .limit(24),
      ]);
      if (cancelled) return;
      if (q?.length) {
        const mapped: Question[] = q.map((r: any) => ({
          type: r.type, q: r.question, fn: r.function ?? "General", diff: r.difficulty ?? "Medium", src: r.source ?? "AI Generated",
        }));
        setQuestions(mapped);
        const t = q.find((r: any) => r.date_assigned === today);
        if (t) {
          setTodays({
            type: t.type, q: t.question, fn: t.function ?? "General", diff: t.difficulty ?? "Medium", src: t.source ?? "AI Generated",
          });
        }
      }
      if (c?.length) setLibrary(c as CaseDeck[]);
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    return questions.filter((x) => {
      if (tab !== "All" && !x.type.toUpperCase().includes(tab.toUpperCase().split(" ")[0])) return false;
      if (fn !== "All" && x.fn !== fn) return false;
      if (diff !== "All" && x.diff !== diff) return false;
      if (search && !`${x.q} ${x.fn} ${x.src}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [questions, tab, fn, diff, search]);

  return (
    <PageShell>
      {/* HERO */}
      <section className="grid-bg">
        <div className="mx-auto max-w-[1280px] px-5 md:px-6 py-14 md:py-20">
          <span className="label-orange">Practice</span>
          <h1
            className="mt-5 font-bold text-[#0a1628]"
            style={{ fontSize: "clamp(34px, 4.5vw, 52px)", letterSpacing: "-0.025em", lineHeight: 1.05 }}
          >
            Daily reps. Ranked solves.<br />
            <span className="brand-italic">Repeatable wins.</span>
          </h1>
          <p
            className="mt-5 max-w-[620px] font-light leading-[1.7] text-[#4a5d76]"
            style={{ fontSize: "16px" }}
          >
            Today's question, the full case library, and your bookmarked drills.
            Solve, get scored, see where you rank.
          </p>
        </div>
      </section>

      {/* TODAYS QUESTION — DARK PANEL */}
      <section className="grid-bg-dark" style={{ borderTop: "1px solid rgba(255,255,255,0.08)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="mx-auto max-w-[1280px] px-5 md:px-6 py-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-block w-2 h-2 bg-[#e8490f] rounded-full" />
            <span className="text-[11px] uppercase font-bold tracking-[0.12em] text-[#e8490f]">
              Today's {todays?.type || "Question"} · {todays?.diff || "Medium"}
            </span>
          </div>
          <p
            className="text-white font-medium leading-[1.3]"
            style={{ fontSize: "clamp(22px, 2.5vw, 30px)", letterSpacing: "-0.015em" }}
          >
            {todays?.q || "Estimate the addressable market for premium pet food in India by 2027."}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="pill pill-orange">{todays?.diff || "Medium"}</span>
            <span className="pill" style={{ background: "#162236", color: "white" }}>
              {todays?.fn || "Strategy"}
            </span>
            <span className="pill" style={{ background: "#162236", color: "white" }}>
              {todays?.src || "AI Generated"}
            </span>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => {
                if (todays?.q) sessionStorage.setItem("constrat:prefill_prompt", todays.q);
                navigate({ to: "/submit-case" });
              }}
              className="btn-primary"
            >
              Attempt now →
            </button>
            <a
              href="#library"
              className="btn-secondary"
              style={{ background: "transparent", color: "white", borderColor: "rgba(255,255,255,0.25)" }}
            >
              Browse case library
            </a>
          </div>
        </div>
      </section>

      {/* CASE LIBRARY */}
      <section className="grid-bg" id="library">
        <div className="mx-auto max-w-[1280px] px-5 md:px-6 py-16">
          <div className="flex items-baseline justify-between mb-6">
            <div>
              <span className="label-orange">Case Library</span>
              <h2
                className="mt-3 font-bold text-[#0a1628]"
                style={{ fontSize: "clamp(26px, 3.2vw, 36px)", letterSpacing: "-0.02em", lineHeight: 1.1 }}
              >
                Ranked cases. Real benchmarks.
              </h2>
            </div>
            <span className="text-[13px] text-[#8a9bb0] tabular-nums">
              {library.length || 0} cases
            </span>
          </div>

          {library.length === 0 ? (
            <div className="surface-flat p-10 text-center">
              <p className="text-[15px] text-[#8a9bb0]">
                Case library is loading. The daily cron will populate it shortly.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-0 border border-[#e2e8f0]">
              {library.map((c, i) => {
                const borderRight = (i + 1) % 3 !== 0;
                const borderBottom = i < library.length - (library.length % 3 || 3);
                return (
                  <button
                    key={c.id}
                    onClick={() => navigate({ to: "/case/$caseId", params: { caseId: c.id } })}
                    className="text-left bg-white hover:bg-[#fafcfe] transition-colors p-6"
                    style={{
                      borderRight: borderRight ? "1px solid #e2e8f0" : "none",
                      borderBottom: borderBottom ? "1px solid #e2e8f0" : "none",
                    }}
                  >
                    <span className="pill pill-orange">{c.category}</span>
                    <h3
                      className="mt-4 font-semibold text-[#0a1628] line-clamp-2"
                      style={{ fontSize: "16px", letterSpacing: "-0.01em", lineHeight: 1.35 }}
                    >
                      {c.name}
                    </h3>
                    {c.description && (
                      <p
                        className="mt-3 text-[#4a5d76] font-light line-clamp-2 leading-[1.5]"
                        style={{ fontSize: "14px" }}
                      >
                        {c.description}
                      </p>
                    )}
                    <div className="mt-5 flex items-center justify-between">
                      <span className="text-[11px] text-[#8a9bb0]">{c.source}</span>
                      <span className="text-[14px] font-semibold text-[#e8490f]">Solve →</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* QUESTION BANK */}
      <section className="grid-bg" style={{ borderTop: "1px solid #e2e8f0" }}>
        <div className="mx-auto max-w-[1280px] px-5 md:px-6 py-16">
          <div className="flex items-baseline justify-between mb-6">
            <div>
              <span className="label-orange">Question Bank</span>
              <h2
                className="mt-3 font-bold text-[#0a1628]"
                style={{ fontSize: "clamp(26px, 3.2vw, 36px)", letterSpacing: "-0.02em", lineHeight: 1.1 }}
              >
                Filter. Pick. Practice.
              </h2>
            </div>
            <span className="text-[13px] text-[#8a9bb0] tabular-nums">
              {filtered.length} of {questions.length}
            </span>
          </div>

          {/* Filter bar */}
          <div className="mt-6 surface-flat p-4 grid md:grid-cols-[1fr_auto_auto_auto] gap-3 items-center">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions, functions, sources…"
              className="input-base w-full"
            />
            <FilterDropdown options={TYPES} value={tab} onChange={setTab} label="Type" />
            <FilterDropdown options={FUNCTIONS} value={fn} onChange={setFn} label="Function" />
            <FilterDropdown options={DIFFS} value={diff} onChange={setDiff} label="Difficulty" />
          </div>

          <div className="mt-6 grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((x, i) => (
              <article key={i} className="card-base p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="pill pill-orange">{x.type}</span>
                  <span className="text-[11px] text-[#8a9bb0]">{x.diff}</span>
                </div>
                <p
                  className="font-semibold text-[#0a1628] line-clamp-3"
                  style={{ fontSize: "16px", lineHeight: 1.45, letterSpacing: "-0.005em" }}
                >
                  {x.q}
                </p>
                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  <span className="pill">{x.fn}</span>
                  <span className="text-[11px] text-[#8a9bb0]">· {x.src}</span>
                </div>
                <button
                  onClick={() => {
                    sessionStorage.setItem("constrat:prefill_prompt", x.q);
                    navigate({ to: "/submit-case" });
                  }}
                  className="mt-4 text-[14px] font-semibold text-[#e8490f] hover:text-[#c03a08]"
                >
                  Attempt →
                </button>
              </article>
            ))}
          </div>

          {filtered.length === 0 && (
            <p className="mt-6 text-center text-[#8a9bb0] py-10 text-[15px]">
              No questions match these filters.
            </p>
          )}
        </div>
      </section>
    </PageShell>
  );
}

function FilterDropdown({
  options,
  value,
  onChange,
  label,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-base appearance-none pr-9 cursor-pointer min-w-[140px]"
        title={label}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {label}: {o}
          </option>
        ))}
      </select>
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a9bb0] pointer-events-none">
        ▾
      </span>
    </div>
  );
}
