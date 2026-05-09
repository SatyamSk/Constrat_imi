import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  const { signIn, user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect
  if (user) {
    navigate({ to: "/" });
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim()) return setError("Please enter your email.");
    if (!password) return setError("Please enter your password.");

    setLoading(true);
    try {
      const { error: authError } = await signIn(email, password);
      if (authError) {
        setError(authError.message);
      } else {
        navigate({ to: "/" });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
    setLoading(false);
  }

  return (
    <PageShell>
      <section className="bg-background">
        <div className="mx-auto max-w-[440px] px-6 py-24">
          <div className="text-center">
            <p className="font-serif text-[22px] font-semibold">Constrat</p>
            <p className="text-[12px] text-text-muted mt-1">Consulting &amp; Strategy Club</p>
          </div>
          <h1 className="mt-10 font-serif text-[40px] font-semibold leading-[1.05] tracking-[-0.025em] text-center">
            Welcome back.
          </h1>

          <form
            onSubmit={handleSubmit}
            className="mt-10 bg-white rounded-[16px] p-6 border border-border space-y-4"
            style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}
          >
            {error && (
              <div className="p-3 rounded-lg bg-urgent-bg border border-urgent/20 text-[13px] text-urgent font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-[12px] font-medium text-text-secondary mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-base w-full"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-text-secondary mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-base w-full"
                placeholder="Your password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Logging in..." : "Login \u2192"}
            </button>

            <div className="flex items-center justify-between text-[13px]">
              <span className="text-text-muted">Forgot password? Contact admin.</span>
              <Link to="/join" className="btn-ghost">Join &rarr;</Link>
            </div>
          </form>
        </div>
      </section>
    </PageShell>
  );
}
