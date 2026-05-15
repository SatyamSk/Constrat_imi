import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/join")({ component: Join });

type SuccessState = null | "confirmed" | "needs_confirmation";

function Join() {
  const { signUp, signInWithGoogle, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<SuccessState>(null);

  // If we already have a session AND we didn't just hit "needs confirmation",
  // bounce to the dashboard.
  useEffect(() => {
    if (!authLoading && user && success !== "needs_confirmation") {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [user, authLoading, navigate, success]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Name is required");
    if (!email.includes("@")) return setError("Enter a valid email");
    if (pass.length < 6) return setError("Password must be at least 6 characters");
    setLoading(true);
    try {
      const { error, needsEmailConfirmation } = await signUp(
        email.trim(),
        pass,
        { full_name: name.trim() },
      );
      if (error) throw error;
      setSuccess(needsEmailConfirmation ? "needs_confirmation" : "confirmed");
      // If confirmed, onAuthStateChange will fire and the effect above redirects.
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.toLowerCase() : "";
      if (msg.includes("already registered") || msg.includes("already been registered")) {
        setError("An account with this email already exists. Please login instead.");
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Signup failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError("");
    setLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) throw error;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google sign-up failed");
      setLoading(false);
    }
  }

  if (success === "needs_confirmation") {
    return (
      <CenteredCard>
        <div className="w-14 h-14 rounded-full bg-orange/10 flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-7 h-7 text-orange"
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
          We sent a confirmation link to <strong>{email}</strong>. Click it to
          activate your account, then come back and log in.
        </p>
        <Link to="/login" className="btn-primary mt-8 inline-flex">
          Back to login
        </Link>
      </CenteredCard>
    );
  }

  if (success === "confirmed") {
    return (
      <CenteredCard>
        <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-7 h-7 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="font-serif text-[28px]">Account created!</h1>
        <p className="mt-3 text-[14px] text-text-secondary leading-[1.65]">
          Welcome to Constrat. Taking you to your dashboard…
        </p>
      </CenteredCard>
    );
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

        <h1 className="font-serif text-[32px] text-center leading-[1.1]">Start preparing today.</h1>
        <p className="mt-3 text-[14px] text-text-secondary text-center">
          Free. No credit card. Instant access to daily cases.
        </p>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="mt-8 w-full h-[48px] flex items-center justify-center gap-3 border border-border rounded-[10px] text-[14px] font-medium hover:border-text-primary transition-colors bg-white disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[12px] text-text-muted">or sign up with email</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <input
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="input-base w-full"
          />
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="input-base w-full"
          />
          <input
            type="password"
            autoComplete="new-password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="Password (6+ characters)"
            className="input-base w-full"
          />
          {error && (
            <p className="text-[13px] text-urgent" role="alert">
              {error}
            </p>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-[13px] text-text-muted">
          Already have an account?{" "}
          <Link to="/login" className="text-orange font-semibold hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-5"
      style={{
        background:
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(232,73,15,0.06), transparent), #FAFAF8",
      }}
    >
      <div className="w-full max-w-[420px] text-center">{children}</div>
    </div>
  );
}
