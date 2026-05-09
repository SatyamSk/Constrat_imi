import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/join")({
  component: Join,
  head: () => ({
    meta: [
      { title: "Join Constrat" },
      { name: "description", content: "Create your Constrat account. Access cases, daily practice, alumni, and timetable alerts." },
      { property: "og:title", content: "Join Constrat" },
      { property: "og:description", content: "Join the community. Access everything Constrat has built." },
    ],
  }),
});

function Join() {
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
            onSubmit={(e) => e.preventDefault()}
            className="mt-10 bg-white rounded-[16px] p-6 border border-border space-y-4"
            style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}
          >
            <Field label="Full Name"><input className="input-base w-full" /></Field>
            <Field label="Email"><input type="email" className="input-base w-full" /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Batch / Year">
                <select className="input-base w-full">
                  <option>2025</option><option>2026</option><option>2027</option>
                </select>
              </Field>
              <Field label="Section">
                <select className="input-base w-full">
                  <option>A</option><option>B</option><option>C</option><option>D</option>
                </select>
              </Field>
            </div>
            <Field label="Phone (for Telegram alerts, optional)">
              <input className="input-base w-full" placeholder="+91" />
            </Field>
            <label className="flex items-center gap-2 text-[13px] text-text-secondary">
              <input type="checkbox" className="accent-orange" /> I am a Constrat member
            </label>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Password"><input type="password" className="input-base w-full" /></Field>
              <Field label="Confirm Password"><input type="password" className="input-base w-full" /></Field>
            </div>
            <button className="btn-primary w-full">Create Account →</button>
            <p className="text-[13px] text-text-secondary text-center">
              Already have an account?{" "}
              <Link to="/login" className="btn-ghost">Login →</Link>
            </p>
          </form>

          <div className="mt-10 grid md:grid-cols-3 gap-3 text-[13px]">
            {[
              "Access 120+ case decks",
              "Daily practice questions and streaks",
              "Timetable alerts to Telegram",
            ].map((b) => (
              <div key={b} className="flex items-start gap-2">
                <span className="text-orange font-semibold">✓</span>
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
