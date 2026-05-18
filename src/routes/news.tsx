import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { PageHeader } from "@/components/PageHeader";
import { AnimatedSection } from "@/components/AnimatedSection";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { generateBrief } from "@/lib/billing";
import { PaywallModal } from "@/components/PaywallModal";

export const Route = createFileRoute("/news")({ component: News });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Stakeholder {
  name: string;
  impact: string;
}

interface GDAnalysis {
  topic?: string;
  ai_summary?: string;
  macro_angle?: string;
  micro_angle?: string;
  arguments_for?: string[];
  arguments_against?: string[];
  stakeholders?: Stakeholder[];
  frameworks?: string[];
  key_stats?: string[];
  related_concepts?: string[];
}

interface NewsRow {
  id: string;
  title: string;
  source: string;
  topic: string;
  url: string;
  image_url: string;
  ai_summary: string;
  country: string;
  read_time: string;
  published_at: string;
  gd_analysis: GDAnalysis | null;
}

// ---------------------------------------------------------------------------
// Topic colors
// ---------------------------------------------------------------------------

const TOPIC_COLORS: Record<string, string> = {
  "Markets & Economy": "#3B82F6",
  "Policy & Regulation": "#F59E0B",
  "Startups & VC": "#22C55E",
  "FMCG & Retail": "#E8490F",
  "Consulting Industry": "#8B5CF6",
  "Global Business": "#06B6D4",
  "India Focus": "#EC4899",
  Technology: "#0EA5E9",
};

const topicColor = (t: string) => TOPIC_COLORS[t] || "#E8490F";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function News() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<NewsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [topic, setTopic] = useState<string>("All");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState<Set<string>>(new Set());
  const [genError, setGenError] = useState<Record<string, string>>({});
  const [paywall, setPaywall] = useState<{ used: number; limit: number; tier: string } | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("news")
        .select(
          "id, title, source, topic, url, image_url, ai_summary, country, read_time, published_at, gd_analysis",
        )
        .order("published_at", { ascending: false })
        .limit(60);
      if (cancelled) return;
      if (error) {
        // eslint-disable-next-line no-console
        console.error("[news] fetch error:", error);
      } else if (data && data.length > 0) {
        setItems(data as NewsRow[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const topics = useMemo(() => {
    const set = new Set<string>(items.map((n) => n.topic).filter(Boolean));
    return ["All", ...Array.from(set)];
  }, [items]);

  const filtered = useMemo(
    () => (topic === "All" ? items : items.filter((n) => n.topic === topic)),
    [items, topic],
  );

  const featured = filtered[0];
  const rest = filtered.slice(1);

  /**
   * Smart toggle: if the brief already exists, just expand. Otherwise call the
   * generate endpoint (quota-gated server-side) and expand once it returns.
   */
  async function handleBriefClick(item: NewsRow) {
    // Already expanded → collapse.
    if (expanded.has(item.id)) {
      setExpanded((prev) => {
        const s = new Set(prev);
        s.delete(item.id);
        return s;
      });
      return;
    }

    // Brief already cached → just expand.
    if (item.gd_analysis && hasGDContent(item.gd_analysis)) {
      setExpanded((prev) => new Set(prev).add(item.id));
      return;
    }

    // Not cached → must be logged in.
    if (!user) {
      navigate({ to: "/login", replace: false });
      return;
    }

    // Call generator.
    setGenerating((prev) => new Set(prev).add(item.id));
    setGenError((prev) => {
      const c = { ...prev };
      delete c[item.id];
      return c;
    });
    try {
      const res = await generateBrief(item.id);
      setItems((prev) =>
        prev.map((row) =>
          row.id === item.id ? { ...row, gd_analysis: res.gd_analysis } : row,
        ),
      );
      setExpanded((prev) => new Set(prev).add(item.id));
    } catch (err: unknown) {
      if (err && typeof err === "object" && (err as any).quotaExceeded) {
        const q = (err as any).quota || {};
        setPaywall({
          used: q.used ?? 0,
          limit: q.limit ?? 0,
          tier: q.tier ?? "free",
        });
      } else {
        setGenError((prev) => ({
          ...prev,
          [item.id]:
            err instanceof Error ? err.message : "Failed to generate brief.",
        }));
      }
    } finally {
      setGenerating((prev) => {
        const s = new Set(prev);
        s.delete(item.id);
        return s;
      });
    }
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Daily Brief"
        title="Today's business intelligence."
        subtitle="Updated daily by AI. Tap any headline to read at the source. Expand the GD brief for macro/micro angles, stakeholders, and arguments."
      />

      <div className="mx-auto max-w-[1180px] px-5 md:px-6 -mt-4 pb-20">
        {/* Topic filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {topics.map((t) => (
            <button
              key={t}
              onClick={() => setTopic(t)}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all ${
                topic === t
                  ? "bg-orange text-white"
                  : "bg-muted/40 text-text-muted hover:text-text-primary"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {loading && (
          <div className="card-base p-12 text-center mb-8">
            <div className="w-8 h-8 mx-auto rounded-full border-2 border-orange border-t-transparent animate-spin" />
            <p className="mt-4 text-[15px] text-text-muted">Loading today's brief…</p>
          </div>
        )}

        {!loading && featured && (
          <FeaturedTile
            item={featured}
            isOpen={expanded.has(featured.id)}
            isGenerating={generating.has(featured.id)}
            errorMsg={genError[featured.id]}
            onBriefClick={() => handleBriefClick(featured)}
          />
        )}

        {!loading && rest.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
            {rest.map((n, i) => (
              <AnimatedSection key={n.id} delay={i * 40}>
                <NewsTile
                  item={n}
                  isOpen={expanded.has(n.id)}
                  isGenerating={generating.has(n.id)}
                  errorMsg={genError[n.id]}
                  onBriefClick={() => handleBriefClick(n)}
                />
              </AnimatedSection>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-[48px] mb-4">📰</p>
            <p className="text-[17px] font-semibold text-text-primary mb-2">
              No articles yet
            </p>
            <p className="text-[14px] text-text-muted max-w-md mx-auto">
              News articles are fetched automatically twice daily from business &amp; economics RSS feeds.
              Admins can trigger a manual fetch from{" "}
              <Link to="/admin" className="text-orange hover:underline">
                Admin → News
              </Link>.
            </p>
          </div>
        )}
      </div>

      {paywall && (
        <PaywallModal
          used={paywall.used}
          limit={paywall.limit}
          tier={paywall.tier}
          kind="gd_brief"
          onClose={() => setPaywall(null)}
        />
      )}
    </PageShell>
  );
}

// ---------------------------------------------------------------------------
// Featured (top story, wide hero layout)
// ---------------------------------------------------------------------------

function FeaturedTile({
  item,
  isOpen,
  isGenerating,
  errorMsg,
  onBriefClick,
}: {
  item: NewsRow;
  isOpen: boolean;
  isGenerating: boolean;
  errorMsg?: string;
  onBriefClick: () => void;
}) {
  const color = topicColor(item.topic);
  const hasCached = item.gd_analysis && hasGDContent(item.gd_analysis);
  return (
    <article className="rounded-[16px] overflow-hidden border border-border shadow-sm" style={{background: "rgba(255,255,255,0.62)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)"}}>
      <div className="grid md:grid-cols-[1.2fr_1fr] gap-0">
        <NewsImage url={item.image_url} fallbackColor={color} topic={item.topic} className="md:h-full md:min-h-[280px] h-[200px]" />
        <div className="p-6 md:p-8 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
              style={{ background: `${color}18`, color }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: color }}
              />
              {item.topic}
            </span>
            <span className="text-[11px] text-text-muted">{item.source}</span>
            <span className="text-[11px] text-text-muted">·</span>
            <span className="text-[11px] text-text-muted">
              {formatDate(item.published_at)}
            </span>
          </div>

          <SourceLink url={item.url} className="block">
            <h2
              className="text-[22px] md:text-[28px] leading-[1.25] text-text-primary hover:text-orange transition-colors"
              style={{ fontWeight: 700, letterSpacing: "-0.02em" }}
            >
              {item.title}
            </h2>
          </SourceLink>

          {item.ai_summary && (
            <p className="mt-3 text-[15px] leading-[1.65] text-text-secondary">
              {item.ai_summary}
            </p>
          )}

          <div className="mt-auto pt-5 flex items-center gap-3 flex-wrap">
            <SourceLink url={item.url}>
              <span className="btn-primary text-[15px] h-9 px-4 inline-flex items-center">
                Read at source →
              </span>
            </SourceLink>
            <button
              onClick={onBriefClick}
              disabled={isGenerating}
              className="btn-secondary text-[15px] h-9 px-4 inline-flex items-center disabled:opacity-60"
              aria-expanded={isOpen}
            >
              {isGenerating
                ? "Generating…"
                : isOpen
                  ? "Hide GD brief"
                  : hasCached
                    ? "Show GD brief"
                    : "Generate GD brief ✨"}
            </button>
          </div>
          {errorMsg && (
            <p className="mt-2 text-[12px] text-urgent" role="alert">
              {errorMsg}
            </p>
          )}
        </div>
      </div>

      {isOpen && item.gd_analysis && (
        <GDDrawer analysis={item.gd_analysis} accent={color} />
      )}
    </article>
  );
}

// ---------------------------------------------------------------------------
// Grid tile
// ---------------------------------------------------------------------------

function NewsTile({
  item,
  isOpen,
  isGenerating,
  errorMsg,
  onBriefClick,
}: {
  item: NewsRow;
  isOpen: boolean;
  isGenerating: boolean;
  errorMsg?: string;
  onBriefClick: () => void;
}) {
  const color = topicColor(item.topic);
  const hasGD = item.gd_analysis && hasGDContent(item.gd_analysis);

  return (
    <article className="card-base overflow-hidden flex flex-col h-full">
      <SourceLink url={item.url}>
        <NewsImage url={item.image_url} fallbackColor={color} topic={item.topic} className="h-[160px]" />
      </SourceLink>

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-2">
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ background: `${color}18`, color }}
          >
            {item.topic}
          </span>
          <span className="text-[11px] text-text-muted truncate">{item.source}</span>
        </div>

        <SourceLink url={item.url} className="block">
          <h3 className="text-[15px] font-semibold leading-[1.4] text-text-primary line-clamp-3 hover:text-orange transition-colors">
            {item.title}
          </h3>
        </SourceLink>

        {item.ai_summary && (
          <p className="mt-2 text-[12px] leading-[1.55] text-text-secondary line-clamp-3">
            {item.ai_summary}
          </p>
        )}

        <div className="mt-auto pt-4 flex items-center justify-between gap-2">
          <span className="text-[11px] text-text-muted shrink-0">
            {formatDate(item.published_at)}
          </span>
          <button
            onClick={onBriefClick}
            disabled={isGenerating}
            className="text-[12px] font-semibold text-orange hover:underline disabled:opacity-60 disabled:no-underline"
            aria-expanded={isOpen}
          >
            {isGenerating
              ? "Generating…"
              : isOpen
                ? "Hide brief −"
                : hasGD
                  ? "Show GD brief +"
                  : "Generate brief ✨"}
          </button>
        </div>

        {errorMsg && (
          <p className="mt-2 text-[11px] text-urgent" role="alert">
            {errorMsg}
          </p>
        )}
      </div>

      {isOpen && item.gd_analysis && (
        <GDDrawer analysis={item.gd_analysis} accent={color} compact />
      )}
    </article>
  );
}

// ---------------------------------------------------------------------------
// GD-prep drawer (the Ground.news-inspired bit)
// ---------------------------------------------------------------------------

function GDDrawer({
  analysis,
  accent,
  compact = false,
}: {
  analysis: GDAnalysis;
  accent: string;
  compact?: boolean;
}) {
  return (
    <div
      className="border-t border-border"
      style={{ background: "#FAFAF6" }}
    >
      <div className={compact ? "p-5 space-y-4" : "p-6 md:p-8 space-y-5"}>
        {/* Macro / Micro split */}
        <div className="grid md:grid-cols-2 gap-3">
          {analysis.macro_angle && (
            <Frame title="Macro angle" accent={accent}>
              {analysis.macro_angle}
            </Frame>
          )}
          {analysis.micro_angle && (
            <Frame title="Micro angle" accent={accent}>
              {analysis.micro_angle}
            </Frame>
          )}
        </div>

        {/* For / Against — ground.news-style two-sided bar */}
        {(analysis.arguments_for?.length || analysis.arguments_against?.length) ? (
          <div className="grid md:grid-cols-2 gap-3">
            <SideBox
              label="Arguments For"
              items={analysis.arguments_for ?? []}
              color="#16A34A"
              icon="+"
            />
            <SideBox
              label="Arguments Against"
              items={analysis.arguments_against ?? []}
              color="#DC2626"
              icon="−"
            />
          </div>
        ) : null}

        {/* Stakeholders */}
        {analysis.stakeholders && analysis.stakeholders.length > 0 && (
          <div>
            <SectionLabel>Stakeholders</SectionLabel>
            <div className="grid sm:grid-cols-3 gap-2">
              {analysis.stakeholders.map((s, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border p-3" style={{background: "rgba(255,255,255,0.62)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)"}}
                >
                  <p className="text-[12px] font-semibold text-text-primary">
                    {s.name}
                  </p>
                  <p className="text-[12px] text-text-secondary leading-[1.5] mt-1">
                    {s.impact}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pill rows */}
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <PillRow label="Frameworks" items={analysis.frameworks ?? []} accent={accent} />
          <PillRow label="Key stats" items={analysis.key_stats ?? []} mono />
          <PillRow label="Related" items={analysis.related_concepts ?? []} />
        </div>
      </div>
    </div>
  );
}

function Frame({
  title,
  accent,
  children,
}: {
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border p-4" style={{background: "rgba(255,255,255,0.62)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)"}}>
      <p
        className="text-[10px] uppercase tracking-[0.1em] font-bold mb-1.5"
        style={{ color: accent }}
      >
        {title}
      </p>
      <p className="text-[15px] leading-[1.6] text-text-primary">{children}</p>
    </div>
  );
}

function SideBox({
  label,
  items,
  color,
  icon,
}: {
  label: string;
  items: string[];
  color: string;
  icon: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-lg border border-border p-4" style={{background: "rgba(255,255,255,0.62)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)"}}>
      <p
        className="text-[10px] uppercase tracking-[0.1em] font-bold mb-2"
        style={{ color }}
      >
        {label}
      </p>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li
            key={i}
            className="text-[12px] leading-[1.55] text-text-primary flex gap-2"
          >
            <span className="font-bold shrink-0" style={{ color }}>
              {icon}
            </span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.1em] font-bold text-text-muted mb-2">
      {children}
    </p>
  );
}

function PillRow({
  label,
  items,
  accent,
  mono = false,
}: {
  label: string;
  items: string[];
  accent?: string;
  mono?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[10px] uppercase tracking-[0.1em] font-bold text-text-muted">
        {label}:
      </span>
      {items.map((it, i) => (
        <span
          key={i}
          className="px-2 py-0.5 rounded-full text-[11px] border"
          style={{
            background: accent ? `${accent}10` : "#FFFFFF",
            color: accent || "#3F3F3F",
            borderColor: accent ? `${accent}30` : "var(--border, #E8E4DE)",
            fontFamily: mono ? "var(--font-mono)" : undefined,
          }}
        >
          {it}
        </span>
      ))}
    </div>
  );
}

/** Map topics to stable picsum seed IDs for consistent placeholder images */
const TOPIC_SEEDS: Record<string, number> = {
  "Markets & Economy": 1011,
  "Policy & Regulation": 1035,
  "Startups & VC": 1060,
  "FMCG & Retail": 1005,
  "Consulting Industry": 1015,
  "Global Business": 1040,
  "India Focus": 1029,
  Technology: 1069,
};

function NewsImage({
  url,
  fallbackColor,
  className = "",
  topic,
}: {
  url?: string;
  fallbackColor: string;
  className?: string;
  topic?: string;
}) {
  const [errored, setErrored] = useState(false);

  // Use picsum.photos with a stable seed per topic for deterministic images
  const seed = TOPIC_SEEDS[topic ?? ""] || 1020;
  const placeholderUrl = `https://picsum.photos/seed/${seed}/800/500`;

  const effectiveUrl = (!url || errored) ? placeholderUrl : url;
  const [fallbackErrored, setFallbackErrored] = useState(false);

  if ((!url || errored) && fallbackErrored) {
    return (
      <div
        className={`w-full ${className}`}
        style={{
          background: `linear-gradient(135deg, ${fallbackColor}, ${fallbackColor}80)`,
        }}
        aria-hidden
      />
    );
  }
  return (
    <img
      src={effectiveUrl}
      alt=""
      loading="lazy"
      onError={() => {
        if (!url || errored) {
          setFallbackErrored(true);
        } else {
          setErrored(true);
        }
      }}
      className={`w-full object-cover ${className}`}
    />
  );
}

function SourceLink({
  url,
  children,
  className = "",
}: {
  url: string;
  children: React.ReactNode;
  className?: string;
}) {
  if (!url || url === "#") return <>{children}</>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
    </a>
  );
}

function formatDate(iso: string) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHr = diffMs / (1000 * 60 * 60);
    if (diffHr < 1) return `${Math.max(1, Math.floor(diffMs / 60000))}m ago`;
    if (diffHr < 24) return `${Math.floor(diffHr)}h ago`;
    if (diffHr < 48) return "Yesterday";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function hasGDContent(g: GDAnalysis) {
  return !!(
    g.macro_angle ||
    g.micro_angle ||
    g.arguments_for?.length ||
    g.arguments_against?.length ||
    g.stakeholders?.length ||
    g.frameworks?.length ||
    g.key_stats?.length ||
    g.related_concepts?.length
  );
}
