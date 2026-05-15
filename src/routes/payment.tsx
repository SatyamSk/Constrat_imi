import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getMySubscription, type SubscriptionInfo } from "@/lib/billing";
import { PageShell, PageHeader } from "@/components/PageShell";
import { GlowCard } from "@/components/GlowCard";

export const Route = createFileRoute("/payment")({ component: Payment });

const PRICE_INR = 99;

function Payment() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login", search: { redirect: "/payment" } as any, replace: true });
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
        body: JSON.stringify({ tier: "pro" }),
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

  return (
    <PageShell>
      <PageHeader
        eyebrow="Pricing"
        title="Unlock Constrat Pro"
        subtitle="More AI briefs. More photo case analyses. Same daily rhythm."
      />

      <div className="mx-auto max-w-[980px] px-5 md:px-6 pb-20">
        {/* Current status banner */}
        {sub && (
          <div
            className="mb-8 p-4 rounded-[12px] border flex items-center justify-between flex-wrap gap-2"
            style={{
              background: isPro ? "#F0FDF4" : "#FFF7F3",
              borderColor: isPro ? "#86EFAC" : "#FED7AA",
            }}
          >
            <div>
              <p className="text-[12px] uppercase tracking-[0.08em] font-bold text-text-muted">
                Current plan
              </p>
              <p
                className="text-[20px] font-semibold mt-1"
                style={{ color: isPro ? "#15803D" : "#C2410C" }}
              >
                {isPro ? "Constrat Pro" : "Free"}
              </p>
              {isPro && sub.current_period_end && (
                <p className="text-[12px] text-text-secondary mt-1">
                  Renews {new Date(sub.current_period_end).toLocaleDateString()}
                </p>
              )}
            </div>
            <Link to="/account" className="text-[13px] text-orange hover:underline">
              Manage account →
            </Link>
          </div>
        )}

        {/* Two-tier grid */}
        <div className="grid md:grid-cols-2 gap-5">
          {/* FREE */}
          <GlowCard className="p-8">
            <div className="relative z-10">
              <p className="text-[11px] uppercase tracking-[0.08em] font-bold text-text-muted">
                Free
              </p>
              <p className="mt-2 font-serif text-[40px] leading-none">₹0</p>
              <p className="text-[12px] text-text-muted mt-1">forever</p>

              <ul className="mt-8 space-y-3 text-[14px] text-text-secondary">
                <Feature included>Daily case + guesstimate</Feature>
                <Feature included>Unlimited text-based case analysis</Feature>
                <Feature included>5 photo case analyses / day</Feature>
                <Feature included>3 GD news briefs / day</Feature>
                <Feature included>Per-case leaderboards</Feature>
                <Feature>Priority support</Feature>
              </ul>

              <div className="mt-8">
                {!isPro ? (
                  <div className="w-full h-11 flex items-center justify-center border border-border rounded-lg text-[13px] text-text-muted">
                    Your current plan
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn-secondary w-full"
                    onClick={() => alert("To downgrade, contact support.")}
                  >
                    Downgrade
                  </button>
                )}
              </div>
            </div>
          </GlowCard>

          {/* PRO */}
          <GlowCard className="p-8" style={{ borderColor: "#E8490F" }}>
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-[0.08em] font-bold text-orange">
                  Pro
                </p>
                <span className="pill pill-orange">Recommended</span>
              </div>
              <p className="mt-2 font-serif text-[40px] leading-none">
                ₹{PRICE_INR}
                <span className="text-[16px] text-text-muted">/month</span>
              </p>
              <p className="text-[12px] text-text-muted mt-1">
                Less than a cup of consulting case prep coffee.
              </p>

              <ul className="mt-8 space-y-3 text-[14px] text-text-secondary">
                <Feature included>Everything in Free</Feature>
                <Feature included>
                  <strong>25</strong> GD news briefs / day
                </Feature>
                <Feature included>
                  <strong>Unlimited</strong> photo case analyses
                </Feature>
                <Feature included>Early access to new cases</Feature>
                <Feature included>Priority email support</Feature>
                <Feature included>Cancel anytime</Feature>
              </ul>

              <div className="mt-8">
                {isPro ? (
                  <div className="w-full h-11 flex items-center justify-center bg-green-50 text-green-700 rounded-lg text-[13px] font-semibold border border-green-200">
                    ✓ You're on Pro
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={startCheckout}
                    disabled={processing}
                    className="btn-primary w-full disabled:opacity-60"
                  >
                    {processing ? "Redirecting…" : `Upgrade for ₹${PRICE_INR}/mo`}
                  </button>
                )}
              </div>

              {error && (
                <p className="mt-3 text-[12px] text-urgent" role="alert">
                  {error}
                </p>
              )}
            </div>
          </GlowCard>
        </div>

        {/* FAQ */}
        <div className="mt-12 grid md:grid-cols-2 gap-6">
          <Faq q="How are GD briefs counted?">
            Each unique news article you generate a brief for counts as one use,
            in a rolling 24-hour window. Briefs that another Pro user has already
            unlocked are free for everyone — community caching keeps your quota
            for fresh stories.
          </Faq>
          <Faq q="What's a 'photo case analysis'?">
            When you upload a photo of a handwritten case solution for GPT-4o
            Vision to score. Typed-text analyses don't count toward this limit.
          </Faq>
          <Faq q="Can I cancel?">
            Anytime. You keep Pro access until the end of your billing period.
          </Faq>
          <Faq q="Refunds?">
            We refund within 7 days of purchase if you haven't used Pro-only
            features. Email us from your account email.
          </Faq>
        </div>
      </div>
    </PageShell>
  );
}

function Feature({
  included = false,
  children,
}: {
  included?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li
      className={`flex items-start gap-2 ${
        included ? "" : "opacity-40 line-through"
      }`}
    >
      <span
        className={`mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
          included ? "bg-green-100 text-green-700" : "bg-muted text-text-muted"
        }`}
      >
        {included ? "✓" : "—"}
      </span>
      <span>{children}</span>
    </li>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[14px] font-semibold text-text-primary">{q}</p>
      <p className="mt-1 text-[13px] text-text-secondary leading-[1.6]">
        {children}
      </p>
    </div>
  );
}
