import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/reset-password")({
  component: ResetPassword,
});

/**
 * Reached from /auth/callback after a password-recovery email link. At this
 * point the user has a temporary session that allows ONE updateUser call.
 */
function ResetPassword() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // If somehow the user lands here without a recovery session, kick to login.
  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/forgot-password", replace: true });
    }
  }, [user, authLoading, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (pass.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (pass !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (!supabase) {
      setError("Auth not configured");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pass });
      if (error) throw error;
      setDone(true);
      setTimeout(() => navigate({ to: "/dashboard", replace: true }), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update password.");
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

        {done ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
              <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="font-serif text-[28px]">Password updated</h1>
            <p className="mt-3 text-[15px] text-text-secondary">
              Taking you to your dashboard…
            </p>
          </div>
        ) : (
          <>
            <h1 className="font-serif text-[32px] text-center leading-[1.1]">
              Choose a new password
            </h1>
            <p className="mt-3 text-[15px] text-text-secondary text-center">
              Pick something memorable. At least 6 characters.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4 mt-8" noValidate>
              <input
                type="password"
                autoComplete="new-password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="New password"
                className="input-base w-full"
              />
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm new password"
                className="input-base w-full"
              />
              {error && (
                <p className="text-[15px] text-urgent" role="alert">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full disabled:opacity-60"
              >
                {submitting ? "Updating…" : "Update password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
