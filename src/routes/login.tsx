import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";

export const Route = createFileRoute("/login")({
  component: Login,
  head: () => ({
    meta: [
      { title: "Login — Constrat" },
      { name: "description", content: "Login to your Constrat account." },
      { property: "og:title", content: "Login — Constrat" },
      { property: "og:description", content: "Welcome back to Constrat." },
    ],
  }),
});

function Login() {
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
            onSubmit={(e) => e.preventDefault()}
            className="mt-10 bg-white rounded-[16px] p-6 border border-border space-y-4"
            style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}
          >
            <div>
              <label className="block text-[12px] font-medium text-text-secondary mb-1.5">Email</label>
              <input type="email" className="input-base w-full" />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-text-secondary mb-1.5">Password</label>
              <input type="password" className="input-base w-full" />
            </div>
            <button className="btn-primary w-full">Login →</button>
            <div className="flex items-center justify-between text-[13px]">
              <a href="#" className="text-text-secondary hover:text-orange">Forgot password?</a>
              <Link to="/join" className="btn-ghost">Don't have an account? Join →</Link>
            </div>
          </form>
        </div>
      </section>
    </PageShell>
  );
}
