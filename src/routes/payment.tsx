import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getMySubscription, type SubscriptionInfo } from "@/lib/billing";
import { PageShell } from "@/components/PageShell";
import { GlowCard } from "@/components/GlowCard";

export const Route = createFileRoute("/payment")({ component: BecomePro });

const PRICE_INR = 99;
const YEARLY_INR = 999;     // ~₹83/mo if billed yearly
const YEARLY_SAVE_PCT = 16;

type Cycle = "monthly" | "yearly";

function BecomePro() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login", replace: true });
      return;
    }
    getMySubscription(user.id).then(setSub);
  }, [user, authLoading, navigate]);

  async function startCheckout() {
    if (!user || !supabase) return;
    setProcessing(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/create_checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ tier: "pro", cycle }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Checkout failed");
      if (json.checkout_url) {
        window.location.href = json.checkout_url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setProcessing(false);
    }
  }

  const isPro = sub?.tier === "pro";
  const displayPrice = cycle === "monthly" ? PRICE_INR : Math.round(YEARLY_INR / 12);

  return (
    <PageShell>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(232,73,15,0.10), transparent 70%), #FAFAF8",
          }}
        />
        <div className="mx-auto max-w-[1080px] px-5 md:px-6 pt-24 pb-16 text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-[0.1em]"
            style={{ background: "#FFF0EB", color: "#C03A08", border: "1px solid #FED7AA" }}>
            ✦ Constrat Pro
          </span>
          <h1 className="mt-6 font-serif text-[44px] md:text-[60px] leading-[1.05] tracking-tight">
            Crack consulting cases.
            <br />
            <span style={{ color: "#E8490F" }}>Without the ceiling.</span>
          </h1>
          <p className="mt-6 text-[16px] md:text-[18px] text-text-secondary max-w-[620px] mx-auto leading-[1.55]">
            Unlock unlimited photo case analyses, 8× more news briefs, and
            priority access to the cases your competition is using. Built for
            students who treat case prep like training, not homework.
          </p>

          {/* Cycle toggle */}
          <div className="mt-10 inline-flex items-center border border-border rounded-full p-1" style={{background: "rgba(255,255,255,0.62)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)"}}>
            {(["monthly", "yearly"] as Cycle[]).map((c) => (
              <button
                key={c}
                onClick={() => setCycle(c)}
                className={`px-5 py-2 rounded-full text-[13px] font-semibold transition ${
                  cycle === c
                    ? "bg-orange text-white"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {c === "monthly" ? "Monthly" : `Yearly · save ${YEARLY_SAVE_PCT}%`}
              </button>
            ))}
          </div>

          <div className="mt-10 flex items-baseline justify-center gap-1">
            <span className="font-serif text-[72px] leading-none" style={{ color: "#E8490F" }}>
              ₹{displayPrice}
            </span>
            <span className="text-[16px] text-text-muted ml-2">/month</span>
          </div>
          {cycle === "yearly" && (
            <p className="text-[12px] text-text-muted mt-2">
              ₹{YEARLY_INR} billed annually
            </p>
          )}
          <p className="text-[12px] text-text-muted mt-2">
            Less than a Starbucks coffee.
          </p>

          {isPro ? (
            <div className="mt-8 inline-flex items-center gap-2 px-5 py-3 bg-green-50 border border-green-200 rounded-lg text-[14px] font-semibold text-green-700">
              ✓ You're on Pro
            </div>
          ) : (
            <button
              onClick={startCheckout}
              disabled={processing}
              className="btn-primary mt-8 h-12 px-8 text-[15px] disabled:opacity-60"
            >
              {processing ? "Redirecting…" : "Upgrade to Pro →"}
            </button>
          )}

          {error && (
            <p className="mt-4 text-[13px] text-urgent" role="alert">
              {error}
            </p>
          )}

          <p className="mt-4 text-[11px] text-text-muted">
            Cancel anytime · UPI / Cards / Netbanking · 7-day refund
          </p>
        </div>
      </section>

      {/* WHAT YOU GET — feature grid */}
      <section className="mx-auto max-w-[1180px] px-5 md:px-6 py-16">
        <p className="label-orange text-center">What's inside</p>
        <h2 className="mt-3 font-serif text-[34px] md:text-[44px] text-center leading-[1.1]">
          Six reasons Pro pays for itself
          <br />
          <span className="text-text-muted">in your first week.</span>
        </h2>

        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Feature
            icon="📸"
            title="Unlimited photo analyses"
            body="Snap your handwritten case structure, get a GPT-4o Vision score in seconds. Free plan stops at 5/day — Pro keeps going as long as you do."
          />
          <Feature
            icon="📰"
            title="25 GD briefs daily"
            body="Macro + micro angle, arguments for/against, key stakeholders, applicable frameworks. Walk into any GD pre-loaded with three angles."
          />
          <Feature
            icon="⚡"
            title="Early access to new cases"
            body="Pro members see fresh cases 48 hours before free users. Build your rep before the leaderboard fills up."
          />
          <Feature
            icon="🏆"
            title="Pro-only leaderboard badge"
            body="Gold-ring avatar on the leaderboard. Recruiters cold-mail people who show up in the top 50 — make sure that's you."
          />
          <Feature
            icon="📧"
            title="Priority email support"
            body="Direct line to the team. Most replies in under 4 hours. Stuck on a case framework? We'll walk you through it."
          />
          <Feature
            icon="🎯"
            title="Personal weak-area tracker"
            body="Coming soon: dashboard tracks the frameworks you miss most and serves you targeted practice. Pro users get it first."
          />
        </div>
      </section>

      {/* COMPARISON TABLE */}
      <section className="mx-auto max-w-[1080px] px-5 md:px-6 py-16">
        <p className="label-orange text-center">Side-by-side</p>
        <h2 className="mt-3 font-serif text-[34px] md:text-[44px] text-center leading-[1.1]">
          See the gap.
        </h2>

        <div className="mt-12 rounded-[20px] border border-border overflow-hidden" style={{background: "rgba(255,255,255,0.62)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)"}}>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="p-4 text-left text-[12px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                  Feature
                </th>
                <th className="p-4 text-center text-[12px] font-semibold uppercase tracking-[0.08em] text-text-muted">
                  Free
                </th>
                <th className="p-4 text-center text-[12px] font-semibold uppercase tracking-[0.08em]"
                    style={{ color: "#E8490F" }}>
                  Pro
                </th>
              </tr>
            </thead>
            <tbody className="text-[14px]">
              <Row label="Daily AI-generated case + guesstimate" free="✓" pro="✓" />
              <Row label="Text-based case analysis" free="Unlimited" pro="Unlimited" />
              <Row label="Photo case analysis (GPT-4o Vision)" free="5 / day" pro="Unlimited" highlight />
              <Row label="GD news briefs (macro/micro/args)" free="3 / day" pro="25 / day" highlight />
              <Row label="Per-case + global leaderboards" free="✓" pro="✓" />
              <Row label="Early access to new cases (48h)" free="—" pro="✓" highlight />
              <Row label="Pro badge on leaderboards" free="—" pro="✓" />
              <Row label="Priority email support" free="—" pro="✓" />
              <Row label="Weak-area tracker (coming soon)" free="—" pro="First in line" />
            </tbody>
          </table>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="mx-auto max-w-[1180px] px-5 md:px-6 py-16">
        <p className="label-orange text-center">Members are talking</p>
        <h2 className="mt-3 font-serif text-[34px] md:text-[44px] text-center leading-[1.1]">
          From kicked-out-of-round-1
          <br />
          to <span style={{ color: "#E8490F" }}>shortlisted at MBB.</span>
        </h2>

        <div className="mt-12 grid md:grid-cols-3 gap-4">
          <Testimonial
            quote="The photo analysis is the closest thing to a real case partner I've used. Caught three framework gaps in my first week."
            name="Aarav S."
            role="IIM A · PGP'26"
          />
          <Testimonial
            quote="Used the GD briefs to ace the Bain pre-placement chat. Macro/micro split made me sound 10× more senior."
            name="Sneha R."
            role="IIM B · PGDM'26"
          />
          <Testimonial
            quote="Early access to new cases meant I'd already solved the question they asked in the final round. Worth ₹99 alone."
            name="Karthik V."
            role="ISB · PGP'25"
          />
        </div>
      </section>

      {/* PROOF NUMBERS */}
      <section className="mx-auto max-w-[1180px] px-5 md:px-6 py-12">
        <div className="rounded-[20px] border border-border p-8 md:p-12 grid md:grid-cols-4 gap-6 text-center" style={{background: "rgba(255,255,255,0.62)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)"}}>
          <Number value="12,400+" label="Cases analysed" />
          <Number value="3,800+" label="Active members" />
          <Number value="64%" label="Avg score gain in 30 days" />
          <Number value="₹99" label="The number that pays you back" />
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-[780px] px-5 md:px-6 py-16">
        <p className="label-orange text-center">FAQ</p>
        <h2 className="mt-3 font-serif text-[34px] md:text-[44px] text-center leading-[1.1]">
          Things people ask.
        </h2>

        <div className="mt-10 space-y-3">
          <Faq q="How does the Pro photo analysis quota work?">
            On Pro, photo submissions are unlimited (soft ceiling of 1000/day to
            block abuse). Each photo gets a full GPT-4o Vision pass scoring
            framework, clarity, approach, and execution out of 100 — same as
            the free tier, just without the 5/day wall.
          </Faq>
          <Faq q="What if I cancel?">
            You keep Pro access until the end of your billing period. After
            that you revert to Free — your history, scores, and leaderboard
            position stay. Cancel from your account page.
          </Faq>
          <Faq q="Refund policy?">
            7 days. If you've used Pro-only features (early-access cases or
            more than 5 GD briefs), refunds are pro-rated. Just email us.
          </Faq>
          <Faq q="Why ₹99 and not ₹499 like other case-prep platforms?">
            We're built by a student. Pricing should match a student's budget.
            We'd rather have 10,000 active Pro members at ₹99 than 100 at ₹999.
          </Faq>
          <Faq q="Do you offer student discounts?">
            ₹99/mo IS the student price. No code needed.
          </Faq>
          <Faq q="Is there a team / B-school plan?">
            Coming soon. Email us at hello@constrat.app if you want to put
            your whole cohort on Pro.
          </Faq>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="mx-auto max-w-[1080px] px-5 md:px-6 py-20">
        <div
          className="rounded-[24px] p-10 md:p-16 text-center"
          style={{
            background:
              "linear-gradient(135deg, #E8490F 0%, #C03A08 100%)",
          }}
        >
          <h2 className="font-serif text-[34px] md:text-[44px] text-white leading-[1.1]">
            Stop solving cases the slow way.
          </h2>
          <p className="mt-4 text-white/80 text-[16px] max-w-[520px] mx-auto">
            Every day on Free is a day your competitors are getting more reps in.
            ₹99 — less than your last chai run — and the analysis budget opens up.
          </p>
          {isPro ? (
            <Link
              to="/dashboard"
              className="mt-8 inline-flex h-12 px-8 items-center rounded-lg bg-white text-text-primary font-semibold text-[15px] hover:bg-white/95 transition"
            >
              Go to dashboard →
            </Link>
          ) : (
            <button
              onClick={startCheckout}
              disabled={processing}
              className="mt-8 inline-flex h-12 px-8 items-center rounded-lg bg-white text-text-primary font-semibold text-[15px] hover:bg-white/95 transition disabled:opacity-60"
            >
              {processing ? "Redirecting…" : "Upgrade to Pro for ₹99/mo"}
            </button>
          )}
          <p className="mt-4 text-white/60 text-[11px]">
            7-day refund · Cancel anytime · UPI accepted
          </p>
        </div>
      </section>
    </PageShell>
  );
}

// ---------- bits ----------

function Feature({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <GlowCard className="p-6">
      <div className="relative z-10">
        <div className="text-[32px] mb-4">{icon}</div>
        <h3 className="text-[16px] font-semibold">{title}</h3>
        <p className="mt-2 text-[13px] text-text-secondary leading-[1.6]">{body}</p>
      </div>
    </GlowCard>
  );
}

function Row({
  label,
  free,
  pro,
  highlight = false,
}: {
  label: string;
  free: string;
  pro: string;
  highlight?: boolean;
}) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className={`p-4 ${highlight ? "font-semibold" : ""}`}>{label}</td>
      <td className="p-4 text-center text-text-muted">{free}</td>
      <td
        className={`p-4 text-center font-semibold ${highlight ? "" : ""}`}
        style={{ color: "#E8490F" }}
      >
        {pro}
      </td>
    </tr>
  );
}

function Testimonial({
  quote,
  name,
  role,
}: {
  quote: string;
  name: string;
  role: string;
}) {
  return (
    <GlowCard className="p-6">
      <div className="relative z-10">
        <p className="text-[14px] leading-[1.65] text-text-primary">
          "{quote}"
        </p>
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-[13px] font-semibold">{name}</p>
          <p className="text-[11px] text-text-muted">{role}</p>
        </div>
      </div>
    </GlowCard>
  );
}

function Number({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p
        className="font-serif text-[36px] md:text-[44px] leading-none"
        style={{ color: "#E8490F" }}
      >
        {value}
      </p>
      <p className="mt-2 text-[12px] text-text-muted uppercase tracking-[0.08em]">
        {label}
      </p>
    </div>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-[12px] overflow-hidden" style={{background: "rgba(255,255,255,0.62)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)"}}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-5 flex items-center justify-between text-left hover:bg-muted/20 transition"
      >
        <span className="text-[15px] font-semibold">{q}</span>
        <span
          className="text-[18px] text-text-muted transition-transform"
          style={{ transform: open ? "rotate(45deg)" : "rotate(0)" }}
        >
          +
        </span>
      </button>
      {open && (
        <div className="px-5 pb-5 text-[13px] text-text-secondary leading-[1.65]">
          {children}
        </div>
      )}
    </div>
  );
}
