import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.includes("@")) {
      setError("Enter a valid email");
      return;
    }
    if (!supabase) {
      setError("Auth is not configured");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        // The recovery email's link points here with ?code=...&type=recovery
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send the email.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-5"
      style={{
        background:
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(232,73,15,0.06), transparent), #FAFAF8",
      }}
    >
      <div className="w-full max-w-[420px]">
        <Link to="/" className="flex items-center gap-2 mb-10 justify-center">
          <div className="w-8 h-8 rounded-lg bg-orange flex items-center justify-center text-white font-serif font-bold text-sm">
            C
          </div>
          <span className="font-serif text-[20px] font-semibold">Constrat</span>
        </Link>

        {sent ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-7 h-7 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h1 className="font-serif text-[28px]">Check your email</h1>
            <p className="mt-3 text-[14px] text-text-secondary leading-[1.65]">
              We sent a password-reset link to <strong>{email}</strong>. Click it
              to choose a new password.
            </p>
            <p className="mt-3 text-[12px] text-text-muted">
              The link works for 1 hour. Check spam if you don't see it.
            </p>
            <Link to="/login" className="btn-secondary mt-8 inline-flex">
              Back to login
            </Link>
          </div>
        ) : (
          <>
            <h1 className="font-serif text-[32px] text-center leading-[1.1]">
              Reset your password
            </h1>
            <p className="mt-3 text-[14px] text-text-secondary text-center">
              Enter the email you used to sign up. We'll send a reset link.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4 mt-8" noValidate>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="input-base w-full"
              />
              {error && (
                <p className="text-[13px] text-urgent" role="alert">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full disabled:opacity-60"
              >
                {submitting ? "Sending…" : "Send reset link"}
              </button>
            </form>

            <p className="mt-6 text-center text-[13px] text-text-muted">
              Remembered it?{" "}
              <Link to="/login" className="text-orange font-semibold hover:underline">
                Back to login
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
