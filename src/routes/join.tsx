import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/join")({
  component: Join,
});

function Join() {
  const { signUp, user } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [batch, setBatch] = useState("2025");
  const [section, setSection] = useState("A");
  const [phone, setPhone] = useState("");
  const [isMember, setIsMember] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect
  if (user) {
    navigate({ to: "/" });
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Validation
    if (!name.trim()) return setError("Please enter your full name.");
    if (!email.trim()) return setError("Please enter your email.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirmPw) return setError("Passwords do not match.");

    setLoading(true);
    try {
      const { error: authError } = await signUp(email, password, {
        full_name: name.trim(),
        batch,
        section,
        phone: phone.trim(),
        is_constrat_member: isMember,
      });

      if (authError) {
        setError(authError.message);
      } else {
        setSuccess(true);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
    setLoading(false);
  }

  if (success) {
    return (
      <PageShell>
        <section className="bg-background">
          <div className="mx-auto max-w-[520px] px-6 py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center text-success text-[28px] mx-auto">
              &#x2713;
            </div>
            <h1 className="mt-6 font-serif text-[36px] font-semibold leading-tight">
              Account created!
            </h1>
            <p className="mt-4 text-[16px] text-text-secondary max-w-[400px] mx-auto">
              Check your email for a confirmation link. Once confirmed, you can log in and access everything.
            </p>
            <Link to="/login" className="btn-primary mt-8 inline-flex">
              Go to Login &rarr;
            </Link>
          </div>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="bg-background">
        <div className="mx-auto max-w-[520px] px-6 py-20">
          <div className="text-center">
            <p className="font-serif text-[22px] font-semibold">Constrat</p>
            <p className="text-[12px] text-text-muted mt-1">Consulting &amp; Strategy Club</p>
          </div>
          <h1 className="mt-10 font-serif text-[44px] md:text-[48px] font-semibold leading-[1.05] tracking-[-0.025em] text-center">
            Join the community.
          </h1>
          <p className="mt-4 text-[16px] text-text-secondary text-center">
            Create your account. Access everything Constrat has built.
          </p>

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

            <Field label="Full Name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-base w-full"
                placeholder="Your full name"
                required
              />
            </Field>

            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-base w-full"
                placeholder="your@email.com"
                required
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Batch / Year">
                <select value={batch} onChange={(e) => setBatch(e.target.value)} className="input-base w-full">
                  <option>2025</option><option>2026</option><option>2027</option>
                </select>
              </Field>
              <Field label="Section">
                <select value={section} onChange={(e) => setSection(e.target.value)} className="input-base w-full">
                  <option>A</option><option>B</option><option>C</option><option>D</option>
                </select>
              </Field>
            </div>

            <Field label="Phone (optional)">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input-base w-full"
                placeholder="+91"
              />
            </Field>

            <label className="flex items-center gap-2 text-[13px] text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={isMember}
                onChange={(e) => setIsMember(e.target.checked)}
                className="accent-orange"
              />
              I am a Constrat member
            </label>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Password">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-base w-full"
                  placeholder="Min 6 characters"
                  required
                  minLength={6}
                />
              </Field>
              <Field label="Confirm Password">
                <input
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  className="input-base w-full"
                  placeholder="Confirm"
                  required
                />
              </Field>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Creating account..." : "Create Account \u2192"}
            </button>

            <p className="text-[13px] text-text-secondary text-center">
              Already have an account?{" "}
              <Link to="/login" className="btn-ghost">Login &rarr;</Link>
            </p>
          </form>

          <div className="mt-10 grid md:grid-cols-3 gap-3 text-[13px]">
            {[
              "Access 120+ case decks",
              "Daily practice questions and streaks",
              "Timetable alerts for your section",
            ].map((b) => (
              <div key={b} className="flex items-start gap-2">
                <span className="text-orange font-semibold">&#x2713;</span>
                <span className="text-text-secondary">{b}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-text-secondary mb-1.5">{label}</label>
      {children}
    </div>
  );
}
