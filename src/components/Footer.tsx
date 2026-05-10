import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="border-t border-border" style={{ background: "#130F0A" }}>
      <div className="mx-auto max-w-[1180px] px-5 md:px-6 py-12 md:py-16">
        <div className="grid md:grid-cols-[1.5fr_1fr_1fr] gap-10">
          <div>
            <Link
              to="/"
              className="text-[20px] font-bold tracking-[-0.02em]"
              style={{ fontFamily: "var(--font-sans)", color: "#FAFAFA" }}
            >
              Constrat
            </Link>
            <p className="mt-3 text-[13px] leading-[1.65] max-w-[280px]" style={{ color: "#777" }}>
              The operating system for MBA placement. Daily cases, company intel, and interview
              prep.
            </p>
          </div>
          <div>
            <p
              className="text-[11px] uppercase tracking-[0.1em] font-semibold mb-4"
              style={{ color: "#555" }}
            >
              Product
            </p>
            <div className="space-y-2.5">
              <Link
                to="/practice"
                className="block text-[13px] hover:text-white transition-colors"
                style={{ color: "#999" }}
              >
                Practice
              </Link>
              <Link
                to="/cases"
                className="block text-[13px] hover:text-white transition-colors"
                style={{ color: "#999" }}
              >
                Case Library
              </Link>
              <Link
                to="/news"
                className="block text-[13px] hover:text-white transition-colors"
                style={{ color: "#999" }}
              >
                News
              </Link>
              <Link
                to="/leaderboard"
                className="block text-[13px] hover:text-white transition-colors"
                style={{ color: "#999" }}
              >
                Leaderboard
              </Link>
            </div>
          </div>
          <div>
            <p
              className="text-[11px] uppercase tracking-[0.1em] font-semibold mb-4"
              style={{ color: "#555" }}
            >
              Company
            </p>
            <div className="space-y-2.5">
              <a
                href="https://www.linkedin.com/company/constrat-imi/"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-[13px] hover:text-white transition-colors"
                style={{ color: "#999" }}
              >
                LinkedIn
              </a>
              <a
                href="https://www.instagram.com/constrat_imi/"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-[13px] hover:text-white transition-colors"
                style={{ color: "#999" }}
              >
                Instagram
              </a>
              <Link
                to="/join"
                className="block text-[13px] hover:text-white transition-colors"
                style={{ color: "#999" }}
              >
                Join Constrat
              </Link>
            </div>
          </div>
        </div>
        <div
          className="mt-10 pt-6 border-t flex flex-wrap items-center justify-between gap-4"
          style={{ borderColor: "#222" }}
        >
          <p className="text-[11px]" style={{ color: "#555" }}>
            &copy; {new Date().getFullYear()} Constrat, IMI Delhi. All rights reserved.
          </p>
          <p className="text-[11px]" style={{ color: "#444" }}>
            Built by Satyam
          </p>
        </div>
      </div>
    </footer>
  );
}
