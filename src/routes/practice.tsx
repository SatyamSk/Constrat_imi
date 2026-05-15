import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { PageShell, PageHeader } from "@/components/PageShell";

export const Route = createFileRoute("/practice")({
  component: Practice,
  head: () => ({
    meta: [
      { title: "Daily Practice — Constrat" },
      {
        name: "description",
        content:
          "Daily case questions, guestimates, GD topics and function-specific interview Qs — filter by type and business function.",
      },
      { property: "og:title", content: "Daily Practice — Constrat" },
      {
        property: "og:description",
        content: "Train like you're already there. Daily questions, streaks, and bookmarks.",
      },
    ],
  }),
});

const TABS = ["All", "Guestimate", "Case Cracker", "Interview Q", "GD Topic"];
const FUNCTIONS = [
  "All",
  "Marketing",
  "Finance",
  "Operations",
  "Consulting",
  "HR",
  "Strategy",
  "General Mgmt",
];
const DIFFS = ["All", "Easy", "Medium", "Hard"];
const SOURCES = ["All", "Competition", "Interview Reported", "Custom"];

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

const FALLBACK_QUESTIONS: Question[] = [
  {
    type: "GUESTIMATE",
    q: "Estimate the daily revenue of all auto-rickshaws in Bengaluru.",
    fn: "Operations",
    diff: "Medium",
    src: "SIP 2024 · Logistics",
  },
  {
    type: "CASE",
    q: "A regional dairy brand is losing share to D2C startups in Tier-1. Diagnose and recommend.",
    fn: "Marketing",
    diff: "Hard",
    src: "Bain Final Round 2024",
  },
  {
    type: "INTERVIEW Q",
    q: "Walk me through how you'd value a quick-commerce startup with negative unit economics.",
    fn: "Finance",
    diff: "Hard",
    src: "Goldman 2024 · IB",
  },
  {
    type: "GD TOPIC",
    q: "Are AI-generated case studies fair in B-school recruitment?",
    fn: "General Mgmt",
    diff: "Easy",
    src: "GD Practice",
  },
  {
    type: "GUESTIMATE",
    q: "Number of pizzas delivered in Mumbai on a Friday evening.",
    fn: "Operations",
    diff: "Easy",
    src: "Custom",
  },
  {
    type: "CASE",
    q: "Help an FMCG client decide whether to enter the men's grooming category.",
    fn: "Strategy",
    diff: "Medium",
    src: "BCG Round 2 2023",
  },
  {
    type: "INTERVIEW Q",
    q: "Tell me about a time you had to convince a team that disagreed with you.",
    fn: "HR",
    diff: "Easy",
    src: "Reported · ITC",
  },
  {
    type: "GUESTIMATE",
    q: "Annual electricity consumption of all malls in Delhi-NCR.",
    fn: "Operations",
    diff: "Hard",
    src: "McKinsey 2023",
  },
  {
    type: "CASE",
    q: "A telco is losing post-paid subscribers to JioFiber. What's the response strategy?",
    fn: "Strategy",
    diff: "Medium",
    src: "Constrat Internal",
  },
  {
    type: "INTERVIEW Q",
    q: "How would you measure the success of a new CRM rollout for a mid-size bank?",
    fn: "Consulting",
    diff: "Medium",
    src: "Reported · Deloitte",
  },
  {
    type: "GD TOPIC",
    q: "Quick-commerce: profitable model or VC-fueled mirage?",
    fn: "Marketing",
    diff: "Medium",
    src: "GD Pool",
  },
  {
    type: "GUESTIMATE",
    q: "Total airtime sold by FM radio stations in India in a year.",
    fn: "Marketing",
    diff: "Hard",
    src: "Reported · IIM-A",
  },
];

const PER_PAGE = 6;

function Practice() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("All");
  const [fn, setFn] = useState("All");
  const [diff, setDiff] = useState("All");
  const [src, setSrc] = useState("All");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [bookmarks, setBookmarks] = useState<Set<number>>(new Set());
  const [questions, setQuestions] = useState<Question[]>(FALLBACK_QUESTIONS);
  const [todaysCase, setTodaysCase] = useState<Question | null>(null);
  const [caseLibrary, setCaseLibrary] = useState<CaseDeck[]>([]);

  // Pull live questions from Supabase if available (populated by daily_question.py cron)
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    let cancelled = false;
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [{ data: qData }, { data: cData }] = await Promise.all([
        supabase
          .from("practice_questions")
          .select("type, question, function, difficulty, source, date_assigned")
          .order("date_assigned", { ascending: false })
          .limit(60),
        supabase
          .from("case_decks")
          .select("id, name, category, source, description")
          .order("created_at", { ascending: false })
          .limit(24),
      ]);
      if (cancelled) return;

      if (qData) {
        const mapped: Question[] = qData.map((row: any) => ({
          type: row.type,
          q: row.question,
          fn: row.function ?? "General Mgmt",
          diff: row.difficulty ?? "Medium",
          src: row.source ?? "AI Generated",
        }));
        if (mapped.length > 0) {
          setQuestions(mapped);
          const todays = qData.find((r: any) => r.date_assigned === today);
          if (todays) {
            setTodaysCase({
              type: todays.type,
              q: todays.question,
              fn: todays.function ?? "General Mgmt",
              diff: todays.difficulty ?? "Medium",
              src: todays.source ?? "AI Generated",
            });
          }
        }
      }
      if (cData) setCaseLibrary(cData as CaseDeck[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = questions.filter((x) => {
    if (tab !== "All" && !x.type.toLowerCase().includes(tab.toLowerCase().split(" ")[0]))
      return false;
    if (fn !== "All" && x.fn !== fn) return false;
    if (diff !== "All" && x.diff !== diff) return false;
    if (q && !x.q.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  function toggleBookmark(idx: number) {
    setBookmarks((prev) => {
      const s = new Set(prev);
      s.has(idx) ? s.delete(idx) : s.add(idx);
      return s;
    });
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Daily Practice"
        title="Train like you're already there."
        subtitle="Questions updated daily. Filter by type and business function."
        alt
      />

      {/* Tabs */}
      <div className="sticky top-16 z-30 bg-surface border-b border-border">
        <div className="mx-auto max-w-[1180px] px-6 flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="relative py-4 px-4 text-[13px] font-medium whitespace-nowrap"
              style={{ color: tab === t ? "#E8490F" : "#5C5C5A" }}
            >
              {t}
              <span className="ml-2 inline-block px-1.5 py-0.5 rounded bg-muted text-[10px] text-text-secondary">
                {
                  questions.filter(
                    (x) =>
                      t === "All" || x.type.toLowerCase().includes(t.toLowerCase().split(" ")[0]),
                  ).length
                }
              </span>
              {tab === t && <span className="absolute left-2 right-2 -bottom-px h-0.5 bg-orange" />}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-[1180px] px-6 py-5 flex flex-wrap items-center gap-4">
          <FilterRow label="Function" options={FUNCTIONS} value={fn} onChange={setFn} />
          <FilterRow label="Difficulty" options={DIFFS} value={diff} onChange={setDiff} />
          <FilterRow label="Source" options={SOURCES} value={src} onChange={setSrc} />
          <div className="ml-auto">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search questions…"
              className="input-base w-[260px]"
            />
          </div>
        </div>
      </section>

      <section className="bg-background">
        <div className="mx-auto max-w-[1180px] px-6 py-12 grid lg:grid-cols-[1fr_280px] gap-10">
          <div>
            {/* Featured */}
            <div
              className="p-8 rounded-[16px]"
              style={{ background: "#FFF0EB", border: "1px solid #E8C4B0" }}
            >
              <div className="flex items-center gap-3">
                <span className="label-orange">
                  {todaysCase
                    ? `Today's ${todaysCase.type.charAt(0) + todaysCase.type.slice(1).toLowerCase()}`
                    : "Today's Question"}
                </span>
                <span className="text-[12px] text-text-muted">Updated daily by AI</span>
              </div>
              <h2 className="mt-4 font-serif text-[28px] leading-[1.2] text-text-primary">
                {todaysCase
                  ? todaysCase.q
                  : "Estimate the number of coffee cups consumed in Delhi in a single day."}
              </h2>
              <div className="mt-4 flex gap-2 flex-wrap">
                <span className="pill pill-orange">{todaysCase?.diff ?? "Medium"}</span>
                <span className="pill">{todaysCase?.fn ?? "Operations"}</span>
                <span className="pill">{todaysCase?.src ?? "Reported · MBB"}</span>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  className="btn-primary"
                  onClick={() => {
                    const prompt = todaysCase?.q ?? "";
                    sessionStorage.setItem("constrat:prefill_prompt", prompt);
                    navigate({ to: "/submit-case" });
                  }}
                >
                  Attempt & Submit Answer
                </button>
              </div>
            </div>

            {/* Case library (merged from /cases) */}
            {caseLibrary.length > 0 && (
              <div className="mt-10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[15px] font-semibold">Case library</h3>
                  <span className="text-[12px] text-text-muted">
                    {caseLibrary.length} ranked cases
                  </span>
                </div>
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {caseLibrary.slice(0, 9).map((c) => (
                    <button
                      key={c.id}
                      onClick={() =>
                        navigate({ to: "/case/$caseId", params: { caseId: c.id } })
                      }
                      className="card-base p-4 text-left hover:border-orange/50 hover:scale-[1.01] transition-all"
                    >
                      <span className="pill pill-orange">{c.category}</span>
                      <p className="mt-3 text-[14px] font-semibold leading-[1.4] line-clamp-2">
                        {c.name}
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-[11px] text-text-muted">
                          {c.source}
                        </span>
                        <span className="text-[12px] text-orange">Solve →</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Grid */}
            <div className="mt-10 grid md:grid-cols-2 xl:grid-cols-3 gap-5">
              {paged.map((x, i) => {
                const gi = (page - 1) * PER_PAGE + i;
                return (
                  <article key={gi} className="card-base p-5 relative">
                    <button
                      aria-label="Bookmark"
                      onClick={() => toggleBookmark(gi)}
                      className="absolute top-4 right-4 text-[14px] hover:text-orange transition-colors"
                      style={{ color: bookmarks.has(gi) ? "#E8490F" : "#A8A199" }}
                    >
                      {bookmarks.has(gi) ? "★" : "☆"}
                    </button>
                    <p
                      className="text-[10px] uppercase tracking-[0.08em] font-semibold"
                      style={{
                        color: x.type === "GUESTIMATE" || x.type === "CASE" ? "#E8490F" : "#5C5C5A",
                      }}
                    >
                      {x.type}
                    </p>
                    <p className="mt-3 text-[15px] font-semibold leading-[1.45] text-text-primary line-clamp-3">
                      {x.q}
                    </p>
                    <div className="mt-4 flex gap-2 flex-wrap">
                      <span className="pill">{x.fn}</span>
                      <span className="pill pill-orange">{x.diff}</span>
                    </div>
                    <div className="mt-5 flex items-center justify-between">
                      <span className="text-[12px] text-text-muted truncate max-w-[160px]">
                        {x.src}
                      </span>
                      <button
                        onClick={() => {
                          sessionStorage.setItem("constrat:prefill_prompt", x.q);
                          navigate({ to: "/submit-case" });
                        }}
                        className="btn-ghost text-[13px]"
                      >
                        Attempt →
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-12 flex items-center justify-between">
              <p className="text-[13px] text-text-muted">
                Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of{" "}
                {filtered.length} questions
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
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            <div className="card-base p-5">
              <p className="label-eyebrow">Your Streak</p>
              <p className="mt-2 font-serif text-[32px] text-orange leading-none">7 days</p>
              <p className="mt-2 text-[12px] text-text-secondary">
                Keep it going! Tomorrow's question drops at 7AM.
              </p>
              <div className="mt-4 grid grid-cols-10 gap-1">
                {Array.from({ length: 30 }).map((_, i) => {
                  const filled = [
                    0, 2, 3, 5, 7, 8, 9, 11, 14, 17, 18, 21, 23, 24, 26, 27, 28, 29,
                  ].includes(i);
                  return (
                    <span
                      key={i}
                      className="w-full aspect-square rounded-[3px]"
                      style={{ background: filled ? "#E8490F" : "#F3F2EF" }}
                    />
                  );
                })}
              </div>
            </div>
            <div className="card-base p-5">
              <p className="label-eyebrow">Bookmarked</p>
              <ul className="mt-3 space-y-3 text-[13px]">
                <li className="line-clamp-2">
                  Walk me through a DCF for a quick-commerce startup.
                </li>
                <li className="line-clamp-2">
                  Help an FMCG client decide whether to enter men's grooming.
                </li>
                <li className="line-clamp-2">
                  Annual electricity consumption of all malls in Delhi-NCR.
                </li>
              </ul>
              <Link to="/practice" className="btn-ghost text-[13px] mt-4 inline-block">
                View all →
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </PageShell>
  );
}

function FilterRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] uppercase tracking-[0.08em] text-text-muted font-semibold">
        {label}:
      </span>
      <div className="flex gap-1.5 flex-wrap">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className="px-3 h-7 rounded-full text-[12px] border transition-colors"
            style={
              value === o
                ? { background: "#E8490F", color: "#fff", borderColor: "#E8490F" }
                : { background: "#fff", color: "#5C5C5A", borderColor: "#E8E4DE" }
            }
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
