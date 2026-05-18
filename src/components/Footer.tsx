import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="grid-bg-dark">
      <div className="mx-auto max-w-[1280px] px-5 md:px-6 py-14">
        <div className="grid md:grid-cols-[1.5fr_1fr_1fr_1fr] gap-10">
          <div>
            <Link
              to="/"
              className="text-[16px] font-bold tracking-tight text-white"
              style={{ letterSpacing: "-0.02em" }}
            >
              Constrat
            </Link>
            <p
              className="mt-4 max-w-[280px] font-light leading-[1.65]"
              style={{ color: "#8a9bb0", fontSize: "12px" }}
            >
              The operating system for MBA placement. Daily cases, company intel, live rankings.
            </p>
          </div>

          <FooterCol title="Product">
            <FooterLink to="/practice">Practice</FooterLink>
            <FooterLink to="/news">News Brief</FooterLink>
            <FooterLink to="/events">Competitions</FooterLink>
            <FooterLink to="/leaderboard">Leaderboard</FooterLink>
          </FooterCol>

          <FooterCol title="Account">
            <FooterLink to="/dashboard">Dashboard</FooterLink>
            <FooterLink to="/account">Profile</FooterLink>
            <FooterLink to="/upgrade">Become Pro</FooterLink>
            <FooterLink to="/join">Sign Up</FooterLink>
          </FooterCol>

          <FooterCol title="Connect">
            <FooterExt href="https://www.linkedin.com/company/constrat-imi/">LinkedIn</FooterExt>
            <FooterExt href="https://www.instagram.com/constrat_imi/">Instagram</FooterExt>
          </FooterCol>
        </div>

        <div
          className="mt-12 pt-6 flex flex-wrap items-center justify-between gap-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
        >
          <p style={{ color: "#8a9bb0", fontSize: "11px" }}>
            © {new Date().getFullYear()} Constrat, IMI Delhi. All rights reserved.
          </p>
          <p style={{ color: "#566c87", fontSize: "11px" }}>Built by Satyam</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p
        className="font-bold mb-4"
        style={{
          fontSize: "10px",
          color: "#566c87",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        {title}
      </p>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="block hover:text-white transition-colors font-light"
      style={{ color: "#8a9bb0", fontSize: "12px" }}
    >
      {children}
    </Link>
  );
}

function FooterExt({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block hover:text-white transition-colors font-light"
      style={{ color: "#8a9bb0", fontSize: "12px" }}
    >
      {children}
    </a>
  );
}
