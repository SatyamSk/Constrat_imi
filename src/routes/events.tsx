import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageShell, PageHeader } from "@/components/PageShell";
import { GlowCard } from "@/components/GlowCard";
import { AnimatedSection } from "@/components/AnimatedSection";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/events")({
  component: Competitions,
  head: () => ({
    meta: [
      { title: "Upcoming Competitions — Constrat" },
      {
        name: "description",
        content:
          "AI-curated list of case competitions, consulting contests, and B-school strategy challenges, updated weekly.",
      },
    ],
  }),
});

interface Comp {
  id: string;
  name: string;
  host: string;
  organizer: string;
  category: string;
  location: string;
  prize: string;
  deadline_date: string | null;
  registration_open: string | null;
  url: string;
  tag: "Live" | "Opening Soon" | "Closed";
  description: string;
  image_url?: string;
}

// Fallback so the page is never empty.
const FALLBACK: Comp[] = [
  {
    id: "f1",
    name: "HUL Lime — The Marketing Quest",
    host: "Hindustan Unilever",
    organizer: "Unstop",
    category: "Marketing",
    location: "Online + India Finals",
    prize: "INR 5L + PPI",
    deadline_date: addDays(14),
    registration_open: null,
    url: "https://unstop.com",
    tag: "Live",
    description:
      "Flagship B2C marketing case challenge from HUL — open to MBA candidates across India.",
    image_url: "",
  },
  {
    id: "f2",
    name: "Bain MBA Case Competition",
    host: "Bain & Company",
    organizer: "Bain",
    category: "Consulting",
    location: "Global · Online",
    prize: "PPI + Cash",
    deadline_date: addDays(31),
    registration_open: null,
    url: "https://www.bain.com",
    tag: "Live",
    description:
      "Global consulting case competition for first-year MBA students with PPI opportunities.",
    image_url: "",
  },
  {
    id: "f3",
    name: "ET Campus Stars",
    host: "Economic Times",
    organizer: "ET",
    category: "Strategy",
    location: "India · Online",
    prize: "INR 8L + Media Coverage",
    deadline_date: addDays(45),
    registration_open: null,
    url: "https://campusstars.economictimes.indiatimes.com",
    tag: "Live",
    description:
      "Cross-domain B-school contest covering strategy, marketing, finance, and operations.",
    image_url: "",
  },
];

function addDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const TAG_COLORS: Record<string, string> = {
  Live: "#16A34A",
  "Opening Soon": "#F59E0B",
  Closed: "#94A3B8",
};

function Competitions() {
  const [items, setItems] = useState<Comp[]>(FALLBACK);
  const [loading, setLoading] = useState(true);
  const [tag, setTag] = useState<string>("All");
  const [category, setCategory] = useState<string>("All");
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("competitions")
        .select(
          "id, name, host, organizer, category, location, prize, deadline_date, registration_open, url, tag, description, image_url",
        )
        .or(`deadline_date.gte.${today},deadline_date.is.null`)
        .order("deadline_date", { ascending: true, nullsFirst: false })
        .limit(60);
      if (cancelled) return;
      if (error) {
        // eslint-disable-next-line no-console
        console.error("[competitions] fetch error:", error);
      } else if (data && data.length > 0) {
        setItems(data as Comp[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>(items.map((c) => c.category).filter(Boolean));
    return ["All", ...Array.from(set)];
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((c) => {
      if (tag !== "All" && c.tag !== tag) return false;
      if (category !== "All" && c.category !== category) return false;
      if (q && !`${c.name} ${c.host} ${c.description}`.toLowerCase().includes(q.toLowerCase()))
        return false;
      return true;
    });
  }, [items, tag, category, q]);

  // Bucket by month for a calendar-y feel.
  const buckets = useMemo(() => {
    const map = new Map<string, Comp[]>();
    for (const c of filtered) {
      if (!c.deadline_date) continue;
      const key = monthKey(c.deadline_date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Competitions"
        title="Upcoming case competitions."
        subtitle="India + global. Curated weekly by AI. Click any tile to register at the host."
      />

      <div className="mx-auto max-w-[1180px] px-5 md:px-6 -mt-2 pb-20">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 md:items-center mb-8">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search competitions"
            className="input-base flex-1"
          />
          <div className="flex gap-2 flex-wrap">
            {["All", "Live", "Opening Soon"].map((t) => (
              <button
                key={t}
                onClick={() => setTag(t)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition ${
                  tag === t
                    ? "bg-orange text-white"
                    : "bg-muted/40 text-text-muted hover:text-text-primary"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1 rounded-full text-[11px] font-medium transition ${
                category === c
                  ? "bg-text-primary text-white"
                  : "bg-muted/40 text-text-muted hover:text-text-primary"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {loading && (
          <div className="card-base p-12 text-center mb-8">
            <div className="w-8 h-8 mx-auto rounded-full border-2 border-orange border-t-transparent animate-spin" />
            <p className="mt-4 text-[15px] text-text-muted">Loading competitions…</p>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <p className="text-center text-text-muted py-16 text-[15px]">
            Nothing matches. Clear filters or check back after the next refresh.
          </p>
        )}

        {!loading &&
          buckets.map(([month, comps]) => (
            <section key={month} className="mb-10">
              <div className="flex items-baseline gap-3 mb-4">
                <h2 className="font-serif text-[22px]">{month}</h2>
                <span className="text-[12px] text-text-muted">
                  {comps.length} {comps.length === 1 ? "deadline" : "deadlines"}
                </span>
              </div>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {comps.map((c, i) => (
                  <AnimatedSection key={c.id} delay={i * 30}>
                    <CompCard c={c} />
                  </AnimatedSection>
                ))}
              </div>
            </section>
          ))}

        {/* Items without a deadline date show after */}
        {!loading && filtered.some((c) => !c.deadline_date) && (
          <section className="mb-10">
            <div className="flex items-baseline gap-3 mb-4">
              <h2 className="font-serif text-[22px]">Open / Rolling</h2>
            </div>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered
                .filter((c) => !c.deadline_date)
                .map((c, i) => (
                  <AnimatedSection key={c.id} delay={i * 30}>
                    <CompCard c={c} />
                  </AnimatedSection>
                ))}
            </div>
          </section>
        )}
      </div>
    </PageShell>
  );
}

function CompCard({ c }: { c: Comp }) {
  const tagColor = TAG_COLORS[c.tag] || TAG_COLORS.Live;
  const daysLeft = c.deadline_date ? daysUntil(c.deadline_date) : null;
  const urgent = daysLeft !== null && daysLeft <= 7;

  return (
    <a
      href={c.url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="block"
    >
      <GlowCard className="p-5 hover:scale-[1.01] transition-transform">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.06em]"
              style={{ background: `${tagColor}18`, color: tagColor }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: tagColor }}
              />
              {c.tag}
            </span>
            {daysLeft !== null && (
              <span
                className="text-[11px] font-mono"
                style={{ color: urgent ? "#DC2626" : "#737067" }}
              >
                {daysLeft === 0
                  ? "Today"
                  : daysLeft < 0
                    ? "Closed"
                    : `${daysLeft}d left`}
              </span>
            )}
          </div>

          <h3 className="text-[15px] font-semibold leading-[1.35] line-clamp-2">
            {c.name}
          </h3>
          <p className="mt-1 text-[12px] text-text-muted truncate">
            {c.host}
            {c.host && c.organizer && c.host !== c.organizer ? " · " : ""}
            {c.host !== c.organizer ? c.organizer : ""}
          </p>

          {c.description && (
            <p className="mt-3 text-[12px] text-text-secondary leading-[1.55] line-clamp-3">
              {c.description}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-text-muted">
            <span>{c.category}</span>
            {c.location && <span>· {c.location}</span>}
            {c.prize && (
              <span className="text-orange font-semibold">· {c.prize}</span>
            )}
          </div>

          {c.deadline_date && (
            <p className="mt-3 text-[11px] text-text-muted">
              Deadline:{" "}
              <span className="font-mono">
                {new Date(c.deadline_date).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </p>
          )}
        </div>
      </GlowCard>
    </a>
  );
}

function daysUntil(iso: string): number {
  const a = new Date();
  a.setHours(0, 0, 0, 0);
  const b = new Date(iso);
  b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function monthKey(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
