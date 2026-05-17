import { ReactNode } from "react";
import { Nav } from "./Nav";
import { Footer } from "./Footer";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#ffffff" }}>
      <Nav />
      <main className="flex-1">{children}</main>
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
      className="bg-white"
      style={{
        borderBottom: "1px solid #e2e8f0",
        background: alt ? "#f7fafc" : "#ffffff",
      }}
    >
      <div className="mx-auto max-w-[1280px] px-5 md:px-6 py-16 md:py-20">
        <span className="label-orange">{eyebrow}</span>
        <h1
          className="mt-5 font-bold text-[36px] md:text-[44px] lg:text-[52px] leading-[1.05] text-[#0a1628] max-w-[820px]"
          style={{ letterSpacing: "-0.025em" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="mt-5 text-[15px] md:text-[16px] text-[#4a5d76] max-w-[640px] leading-[1.65] font-light">
            {subtitle}
          </p>
        )}
        {children && <div className="mt-7">{children}</div>}
      </div>
    </section>
  );
}
