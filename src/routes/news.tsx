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
// Static fallback (used only when Supabase is empty/unconfigured)
// ---------------------------------------------------------------------------

const FALLBACK: NewsRow[] = [
  {
    id: "f1",
    title: "Reliance Retail posts 18% revenue growth in Q3, signals aggressive expansion in quick commerce",
    source: "Economic Times",
    topic: "FMCG & Retail",
    url: "https://economictimes.indiatimes.com",
    image_url: "",
    ai_summary: "Reliance Retail accelerated revenue growth on the back of quick commerce and a wider store footprint.",
    country: "IN",
    read_time: "2 min",
    published_at: new Date().toISOString(),
    gd_analysis: {
      topic: "FMCG & Retail",
      macro_angle: "Quick commerce is reshaping Indian retail's last-mile economics and pulling consumption away from kirana stores.",
      micro_angle: "Reliance's scale advantage in supply chain and store density lets it cross-subsidise 10-minute delivery longer than DTC challengers.",
      arguments_for: ["Quick commerce solves real time-poverty in urban India.", "Scale players can hit unit-economics breakeven faster.", "Drives formalisation of an unorganised retail base."],
      arguments_against: ["Unit economics still negative for most players.", "Threatens 12 million-odd kirana livelihoods.", "Encourages overconsumption and packaging waste."],
      stakeholders: [
        { name: "Reliance Retail", impact: "Wins from scale and exclusive brand portfolio." },
        { name: "Kirana stores", impact: "Lose share in metros; viable only in long-tail SKUs." },
        { name: "Gig workers", impact: "More gigs at thin per-order margins." },
      ],
      frameworks: ["Porter's 5 Forces", "Value Chain"],
      key_stats: ["18% YoY revenue growth"],
      related_concepts: ["Quick commerce", "Channel disruption", "Network effects"],
    },
  },
  {
    id: "f2",
    title: "Crude oil falls below $75 as OPEC+ signals production increase in Q2",
    source: "Reuters",
    topic: "Markets & Economy",
    url: "https://www.reuters.com/business/energy",
    image_url: "",
    ai_summary: "Crude directly impacts India's CAD and inflation — a staple macro question in GD/PI rounds.",
    country: "GLOBAL",
    read_time: "2 min",
    published_at: new Date(Date.now() - 3600000).toISOString(),
    gd_analysis: {
      topic: "Markets & Economy",
      macro_angle: "Lower oil prices reduce India's import bill and ease inflationary pressure, giving RBI room for rate cuts.",
      micro_angle: "Airlines and logistics firms see immediate margin relief; upstream producers like ONGC face revenue headwinds.",
      arguments_for: ["Lower input costs across manufacturing sectors.", "Positive for India's current account deficit.", "Consumer spending power improves with cheaper fuel."],
      arguments_against: ["OPEC+ production hikes may be temporary and politically motivated.", "Green-energy transition investment slows when fossil fuels are cheap.", "Oil-exporting trade partners may cut imports from India."],
      stakeholders: [
        { name: "Indian Oil Marketing Cos", impact: "Better under-recovery margins and stable retail pricing." },
        { name: "ONGC / Oil India", impact: "Revenue decline from lower crude realisation." },
        { name: "Indian consumers", impact: "Potential fuel price cuts improve disposable income." },
      ],
      frameworks: ["PESTLE", "Supply-Demand Analysis"],
      key_stats: ["$75/barrel Brent crude", "India imports ~85% of crude needs"],
      related_concepts: ["Current account deficit", "Monetary policy transmission", "Commodity cycles"],
    },
  },
  {
    id: "f3",
    title: "Swiggy's food delivery losses narrow to ₹625 Cr, Instamart GMV up 40%",
    source: "Mint",
    topic: "Startups & VC",
    url: "https://www.livemint.com/companies",
    image_url: "",
    ai_summary: "Unit economics turnaround makes this a strong profitability case study for MBA interviews.",
    country: "IN",
    read_time: "2 min",
    published_at: new Date(Date.now() - 7200000).toISOString(),
    gd_analysis: {
      topic: "Startups & VC",
      macro_angle: "India's gig economy is maturing: platform companies are shifting from growth-at-all-costs to profitability.",
      micro_angle: "Swiggy's Instamart pivot shows how quick commerce can cross-subsidise the food delivery vertical.",
      arguments_for: ["Path-to-profitability signals attract institutional investors.", "Quick commerce creates stickier user base than food-only.", "India's urban density favours hyper-local delivery models."],
      arguments_against: ["₹625 Cr loss is still substantial; cash runway is finite.", "Quick commerce margins are razor-thin without scale.", "Competitive intensity from Zepto and Blinkit squeezes margins."],
      stakeholders: [
        { name: "Swiggy", impact: "Narrowing losses improve IPO narrative and valuation." },
        { name: "Delivery partners", impact: "Higher order volumes but continued gig-economy precarity." },
        { name: "VCs / Public investors", impact: "Better unit economics de-risk follow-on investment." },
      ],
      frameworks: ["Unit Economics", "BCG Matrix"],
      key_stats: ["₹625 Cr loss (narrowed)", "Instamart GMV +40%"],
      related_concepts: ["Gig economy", "Platform economics", "Path to profitability"],
    },
  },
  {
    id: "f4",
    title: "RBI holds repo rate at 6.5% for eighth consecutive meeting, signals rate cut in June",
    source: "Business Standard",
    topic: "Policy & Regulation",
    url: "https://www.business-standard.com",
    image_url: "",
    ai_summary: "Monetary policy transmission is a core macroeconomics concept tested in PI rounds.",
    country: "IN",
    read_time: "2 min",
    published_at: new Date(Date.now() - 10800000).toISOString(),
    gd_analysis: {
      topic: "Policy & Regulation",
      macro_angle: "Prolonged rate pauses reflect RBI's balancing act between growth support and inflation targeting.",
      micro_angle: "Banks sitting on excess liquidity may see NIM compression once rate cuts begin.",
      arguments_for: ["Rate stability gives businesses predictability for capex planning.", "Inflation targeting builds long-term credibility for the central bank.", "Gradual cuts prevent asset bubbles."],
      arguments_against: ["Prolonged high rates choke MSME credit growth.", "Housing EMIs remain elevated, hurting middle-class consumption.", "India's rate differential with the West narrows, pressuring rupee carry trades."],
      stakeholders: [
        { name: "RBI", impact: "Maintains inflation-targeting credibility but faces growth criticism." },
        { name: "Banks", impact: "High rates support NIMs now but create repricing risk on cuts." },
        { name: "Homebuyers", impact: "No immediate relief on EMIs; waiting for June signal." },
      ],
      frameworks: ["Monetary Policy Framework", "IS-LM Model"],
      key_stats: ["6.5% repo rate", "8 consecutive holds"],
      related_concepts: ["Monetary policy transmission", "Inflation targeting", "Liquidity management"],
    },
  },
  {
    id: "f5",
    title: "Tata Motors demerger: CV and PV businesses to be separate listed entities",
    source: "Economic Times",
    topic: "Consulting Industry",
    url: "https://economictimes.indiatimes.com",
    image_url: "",
    ai_summary: "Corporate restructuring and demerger logic — frequently asked in strategy cases.",
    country: "IN",
    read_time: "2 min",
    published_at: new Date(Date.now() - 14400000).toISOString(),
    gd_analysis: {
      topic: "Consulting Industry",
      macro_angle: "Conglomerate demergers reflect a global trend toward focused pure-play businesses that command higher valuation multiples.",
      micro_angle: "Separating the JLR-led PV business from the cyclical CV arm lets each pursue distinct capital strategies.",
      arguments_for: ["Unlocks hidden value — sum-of-parts often exceeds conglomerate discount.", "Each entity can pursue independent M&A and partnerships.", "Investor base gets cleaner exposure to preferred segment."],
      arguments_against: ["Loss of cross-subsidisation between profitable and growing segments.", "Demerger execution risk and one-time costs.", "Smaller standalone entities may have weaker negotiating power with suppliers."],
      stakeholders: [
        { name: "Tata Motors shareholders", impact: "Potential value unlock if market rewards pure-play multiples." },
        { name: "JLR", impact: "Independent listing gives direct access to capital markets for EV transition." },
        { name: "Employees", impact: "Organisational restructuring may create uncertainty in overlapping functions." },
      ],
      frameworks: ["Sum-of-Parts Valuation", "Corporate Portfolio Strategy"],
      key_stats: [],
      related_concepts: ["Conglomerate discount", "Demerger", "Corporate restructuring"],
    },
  },
  {
    id: "f6",
    title: "Zomato acquires Paytm's events business for ₹2,048 Cr",
    source: "Mint",
    topic: "Startups & VC",
    url: "https://www.livemint.com/companies",
    image_url: "",
    ai_summary: "Platform adjacency and acquisition strategy — a BCG/Bain interview favourite.",
    country: "IN",
    read_time: "2 min",
    published_at: new Date(Date.now() - 18000000).toISOString(),
    gd_analysis: {
      topic: "Startups & VC",
      macro_angle: "India's platform economy is consolidating as well-funded players acquire adjacencies to own more consumer time and wallet share.",
      micro_angle: "Zomato aims to build a 'going-out' super-app; events add a high-margin, low-frequency vertical to the food delivery base.",
      arguments_for: ["Events create a natural upsell for Zomato's dining-out vertical.", "Paytm needed to divest non-core assets to improve profitability optics.", "Zomato captures ticketing data for better personalisation."],
      arguments_against: ["₹2,048 Cr is steep for a business with unclear standalone profitability.", "Integration risk between food-tech and events-tech teams.", "BookMyShow is an entrenched competitor with stronger content relationships."],
      stakeholders: [
        { name: "Zomato", impact: "Expands TAM but dilutes focus from food/quick-commerce." },
        { name: "Paytm", impact: "Cash infusion improves balance sheet; loses consumer engagement vertical." },
        { name: "BookMyShow", impact: "Faces well-funded new competitor with Zomato's distribution reach." },
      ],
      frameworks: ["Ansoff Matrix", "M&A Synergy Analysis"],
      key_stats: ["₹2,048 Cr deal value"],
      related_concepts: ["Platform adjacency", "Super-app strategy", "Inorganic growth"],
    },
  },
  {
    id: "f7",
    title: "India's services PMI hits 14-month high at 61.7, manufacturing PMI at 56.5",
    source: "Reuters",
    topic: "Markets & Economy",
    url: "https://www.reuters.com/world/india",
    image_url: "",
    ai_summary: "PMI data interpretation is a common GD topic and PI question for MBA aspirants.",
    country: "IN",
    read_time: "2 min",
    published_at: new Date(Date.now() - 21600000).toISOString(),
    gd_analysis: {
      topic: "Markets & Economy",
      macro_angle: "Strong PMI readings signal robust economic expansion and support India's premium GDP growth narrative among emerging markets.",
      micro_angle: "Services dominance (61.7 vs 56.5 manufacturing) highlights India's structural tilt toward the tertiary sector.",
      arguments_for: ["Above-50 PMI confirms expansion; 61.7 is among the highest globally.", "Strong services PMI supports IT, consulting, and financial sector hiring.", "Manufacturing PMI at 56.5 shows Make-in-India initiatives gaining traction."],
      arguments_against: ["PMI is a sentiment indicator, not a hard output measure.", "Services-heavy growth may not create enough blue-collar employment.", "High PMI can be inflationary if supply doesn't keep pace with demand."],
      stakeholders: [
        { name: "Indian government", impact: "Strong macro data supports sovereign rating upgrade narrative." },
        { name: "FIIs", impact: "Bullish PMI attracts equity inflows into India-focused funds." },
        { name: "Job seekers", impact: "Services expansion creates white-collar opportunities; manufacturing lags." },
      ],
      frameworks: ["Leading Indicators Analysis", "Sectoral Composition"],
      key_stats: ["Services PMI 61.7", "Manufacturing PMI 56.5", "14-month high"],
      related_concepts: ["PMI", "GDP composition", "Business cycle indicators"],
    },
  },
  {
    id: "f8",
    title: "Hindustan Unilever launches direct-to-consumer brands, bypasses traditional retail",
    source: "Economic Times",
    topic: "FMCG & Retail",
    url: "https://economictimes.indiatimes.com",
    image_url: "",
    ai_summary: "Channel disruption and DTC strategy — relevant for marketing and market entry cases.",
    country: "IN",
    read_time: "2 min",
    published_at: new Date(Date.now() - 25200000).toISOString(),
    gd_analysis: {
      topic: "FMCG & Retail",
      macro_angle: "Legacy FMCG giants adopting DTC signals a structural shift in how consumer goods reach end users in India.",
      micro_angle: "HUL captures first-party data and higher margins by cutting general trade intermediaries on select SKUs.",
      arguments_for: ["DTC gives HUL direct consumer data for better personalisation.", "Higher margins without distributor/retailer cuts.", "Faster product iteration cycles based on real-time feedback."],
      arguments_against: ["DTC customer acquisition cost is high for FMCG's low AOV.", "Alienates existing general trade and MT partners.", "Logistics complexity for a company used to bulk distribution."],
      stakeholders: [
        { name: "HUL", impact: "Gains data and margins but must invest heavily in digital infra." },
        { name: "Distributors", impact: "Disintermediated on DTC SKUs; face margin and relevance erosion." },
        { name: "Consumers", impact: "More choice and subscription convenience; potential savings." },
      ],
      frameworks: ["Channel Strategy", "Disintermediation"],
      key_stats: [],
      related_concepts: ["DTC strategy", "First-party data", "Channel conflict"],
    },
  },
  {
    id: "f9",
    title: "EU announces Carbon Border Adjustment Mechanism — Indian steel and aluminium exporters face new levies",
    source: "Reuters",
    topic: "Global Business",
    url: "https://www.reuters.com/business",
    image_url: "",
    ai_summary: "CBAM is a hot GD topic combining trade policy, climate action, and competitiveness.",
    country: "GLOBAL",
    read_time: "2 min",
    published_at: new Date(Date.now() - 28800000).toISOString(),
    gd_analysis: {
      topic: "Global Business",
      macro_angle: "CBAM marks a paradigm shift where climate regulation becomes a trade barrier, potentially reshaping global supply chains.",
      micro_angle: "Indian steel exporters face 20-35% effective tariff increases to the EU, eroding price competitiveness against cleaner competitors.",
      arguments_for: ["Levels the playing field for EU producers who bear carbon costs.", "Incentivises developing nations to decarbonise faster.", "Prevents carbon leakage through imports."],
      arguments_against: ["Functions as green protectionism against developing economies.", "India's grid is coal-heavy — penalises structural disadvantage, not intent.", "Compliance reporting is complex and costly for SME exporters."],
      stakeholders: [
        { name: "Indian steel industry", impact: "Faces margin squeeze on EU-bound exports; must invest in green tech." },
        { name: "EU manufacturers", impact: "Competitive relief from cheaper carbon-intensive imports." },
        { name: "WTO", impact: "Faces challenge on whether CBAM complies with non-discrimination principles." },
      ],
      frameworks: ["Trade Policy Analysis", "Externalities & Pigovian Tax"],
      key_stats: ["20-35% effective tariff on carbon-intensive imports"],
      related_concepts: ["Carbon border tax", "Green protectionism", "Carbon leakage"],
    },
  },
  {
    id: "f10",
    title: "OpenAI valued at $150B in latest funding round; enterprise revenue surpasses consumer",
    source: "Reuters",
    topic: "Technology",
    url: "https://www.reuters.com/technology",
    image_url: "",
    ai_summary: "AI valuations and the enterprise-vs-consumer debate are critical for tech-sector strategy questions.",
    country: "GLOBAL",
    read_time: "2 min",
    published_at: new Date(Date.now() - 32400000).toISOString(),
    gd_analysis: {
      topic: "Technology",
      macro_angle: "The AI industry's rapid capitalisation is drawing comparisons to the dot-com era — raising questions about sustainable value creation.",
      micro_angle: "OpenAI's enterprise revenue overtaking consumer signals that B2B AI tooling has stronger unit economics than chatbot subscriptions.",
      arguments_for: ["Enterprise contracts provide predictable, high-margin recurring revenue.", "AI productivity gains justify premium pricing in knowledge work.", "$150B valuation reflects scarcity premium on frontier model capability."],
      arguments_against: ["Revenue multiples are astronomical even by tech standards.", "Open-source models are closing the capability gap rapidly.", "Regulatory uncertainty could constrain deployment in key verticals."],
      stakeholders: [
        { name: "OpenAI", impact: "Capital war chest enables compute scaling; valuation sets expectations impossibly high." },
        { name: "Enterprise customers", impact: "Benefit from competition but face vendor lock-in risks." },
        { name: "Open-source community", impact: "Capital asymmetry threatens OSS competitiveness at frontier scale." },
      ],
      frameworks: ["SaaS Valuation Metrics", "Technology Adoption Lifecycle"],
      key_stats: ["$150B valuation", "Enterprise > consumer revenue"],
      related_concepts: ["AI hype cycle", "Enterprise SaaS", "Frontier models"],
    },
  },
  {
    id: "f11",
    title: "India's semiconductor fab in Gujarat achieves first test production — Tata-PSMC JV milestone",
    source: "Economic Times",
    topic: "India Focus",
    url: "https://economictimes.indiatimes.com",
    image_url: "",
    ai_summary: "India's semiconductor ambitions are a critical industrial policy topic for interviews and GDs.",
    country: "IN",
    read_time: "2 min",
    published_at: new Date(Date.now() - 36000000).toISOString(),
    gd_analysis: {
      topic: "India Focus",
      macro_angle: "Indigenous chip manufacturing is central to India's strategic autonomy and China+1 supply chain diversification narrative.",
      micro_angle: "Tata-PSMC's test production at the Dholera fab validates the ₹91,000 Cr incentive scheme's viability.",
      arguments_for: ["Reduces dependency on Taiwan/China for critical semiconductor supply.", "Creates high-skilled employment and tech ecosystem.", "Strengthens India's position in global electronics value chain."],
      arguments_against: ["India is entering at mature nodes (28nm+), not cutting edge.", "Massive government subsidies with uncertain ROI timeline.", "Water and power intensity of fabs conflicts with sustainability goals."],
      stakeholders: [
        { name: "Tata Group", impact: "First-mover advantage in Indian semiconductor manufacturing." },
        { name: "Government of India", impact: "Flagship industrial policy success; political dividend if scaled." },
        { name: "Global OEMs", impact: "New supply source diversifies away from TSMC concentration risk." },
      ],
      frameworks: ["Industrial Policy Analysis", "Global Value Chain"],
      key_stats: ["₹91,000 Cr incentive scheme"],
      related_concepts: ["Semiconductor self-sufficiency", "China+1 strategy", "Industrial policy"],
    },
  },
  {
    id: "f12",
    title: "McKinsey projects India's consulting market to grow 15% annually through 2028",
    source: "Business Standard",
    topic: "Consulting Industry",
    url: "https://www.business-standard.com",
    image_url: "",
    ai_summary: "Industry growth projections for consulting directly relevant to MBA career planning and case interviews.",
    country: "IN",
    read_time: "2 min",
    published_at: new Date(Date.now() - 39600000).toISOString(),
    gd_analysis: {
      topic: "Consulting Industry",
      macro_angle: "India's consulting boom is driven by digital transformation mandates, GCC expansion, and PE-backed portfolio company optimisation.",
      micro_angle: "MBB firms are expanding India headcount 20-25% YoY, with Bangalore and Gurgaon emerging as global delivery hubs.",
      arguments_for: ["Digital and AI advisory demand is structural, not cyclical.", "India GCCs create recurring transformation engagements.", "PE/VC deal boom drives due diligence and post-merger integration work."],
      arguments_against: ["AI tools may automate junior analyst work, shrinking pyramid base.", "Pricing pressure from Big 4 and boutique firms intensifying.", "Talent poaching between firms inflates costs without proportional revenue."],
      stakeholders: [
        { name: "MBB firms", impact: "Revenue tailwind but must evolve delivery model for AI era." },
        { name: "MBA graduates", impact: "Strong hiring outlook but role content shifting toward tech-enabled advisory." },
        { name: "Indian enterprises", impact: "Access to global best practices; risk of over-reliance on external strategy." },
      ],
      frameworks: ["Industry Growth Analysis", "Competitive Landscape"],
      key_stats: ["15% annual growth through 2028", "20-25% YoY headcount expansion"],
      related_concepts: ["Management consulting", "GCC expansion", "Digital transformation"],
    },
  },
];

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
  const [items, setItems] = useState<NewsRow[]>(FALLBACK);
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
          <p className="text-center text-text-muted py-16 text-[15px]">
            No stories yet for this topic. Check back after the next refresh.
          </p>
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

/** Map topics to image search terms for auto-generated Unsplash images */
const TOPIC_IMAGE_TERMS: Record<string, string> = {
  "Markets & Economy": "stock+market+trading",
  "Policy & Regulation": "government+policy",
  "Startups & VC": "startup+office+tech",
  "FMCG & Retail": "retail+store+shopping",
  "Consulting Industry": "business+consulting+meeting",
  "Global Business": "global+trade+shipping",
  "India Focus": "india+business+city",
  Technology: "technology+artificial+intelligence",
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

  // Generate a topic-aware Unsplash image when no URL is provided
  const effectiveUrl = (!url || errored)
    ? `https://source.unsplash.com/800x500/?${TOPIC_IMAGE_TERMS[topic ?? ""] || "business+finance"}`
    : url;

  // If Unsplash also errors, fall back to gradient
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
