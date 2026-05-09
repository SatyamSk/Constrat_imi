import { ReactNode } from "react";
import { Nav } from "./Nav";
import { Footer } from "./Footer";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Nav />
      <main className="pt-16 flex-1">{children}</main>
      <Footer />
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  alt = false,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  alt?: boolean;
  children?: ReactNode;
}) {
  return (
    <section
      className={`border-b border-border ${alt ? "bg-section-alt" : "bg-surface"}`}
    >
      <div className="mx-auto max-w-[1180px] px-5 md:px-6 py-16 md:py-20">
        <span className="label-orange">{eyebrow}</span>
        <h1 className="mt-5 font-serif font-semibold text-[36px] md:text-[48px] lg:text-[52px] leading-[1.05] tracking-[-0.025em] text-text-primary max-w-[820px]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-5 text-[16px] md:text-[17px] text-text-secondary max-w-[640px] leading-[1.65]">{subtitle}</p>
        )}
        {children && <div className="mt-7">{children}</div>}
      </div>
    </section>
  );
}
