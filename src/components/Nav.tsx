import { Link, useRouterState } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";

const links = [
  { label: "Practice", to: "/practice" },
  { label: "Cases", to: "/cases" },
  { label: "News", to: "/news" },
  { label: "Leaderboard", to: "/leaderboard" },
  { label: "Timetable", to: "/timetable" },
  { label: "Deadlines", to: "/deadlines" },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, isMember, isAdmin, signOut } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setOpen(false); }, [path]);

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-50 h-[70px] transition-all duration-300 ${
          scrolled
            ? "glass-dark shadow-lg"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto max-w-[1180px] h-full px-5 md:px-6 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-orange flex items-center justify-center text-white font-serif font-bold text-sm transition-transform group-hover:scale-105">
              C
            </div>
            <span className="font-serif text-[20px] font-semibold text-text-primary tracking-tight">
              Constrat
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {links.map((l) => {
              const active = path === l.to || (l.to !== "/" && path.startsWith(l.to));
              return (
                <Link
                  key={l.label}
                  to={l.to}
                  className={`relative px-3.5 py-2 text-[13px] font-medium rounded-lg transition-all duration-200 ${
                    active
                      ? "text-orange bg-orange-tint"
                      : "text-text-secondary hover:text-text-primary hover:bg-muted/60"
                  }`}
                >
                  {l.label}
                  {active && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Desktop right side */}
          <div className="hidden lg:flex items-center gap-2.5">
            {user && isAdmin && (
              <Link
                to="/admin"
                className="h-8 px-3 inline-flex items-center text-[12px] font-semibold rounded-lg bg-dark text-white hover:bg-dark/90 transition-colors"
              >
                Admin
              </Link>
            )}
            {user ? (
              <div className="flex items-center gap-2">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-[12px] cursor-pointer border-2 border-orange/30 hover:border-orange transition-colors"
                  style={{ background: "#FFF0EB", color: "#C03A08" }}
                  title={user.email || "Profile"}
                >
                  {(user.user_metadata?.full_name || user.email || "U").split(" ").map((s: string) => s[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <button
                  onClick={() => signOut()}
                  className="h-8 px-3 inline-flex items-center text-[12px] border border-border rounded-lg text-text-secondary hover:text-text-primary hover:border-text-primary transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="h-9 px-4 inline-flex items-center text-[13px] border border-border rounded-lg text-text-secondary hover:text-text-primary hover:border-text-primary transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/join"
                  className="h-9 px-5 inline-flex items-center text-[13px] font-semibold rounded-lg bg-orange text-white hover:bg-orange-hover transition-all hover:-translate-y-px shadow-sm"
                >
                  Join Constrat
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen(true)}
            className="lg:hidden w-10 h-10 flex items-center justify-center rounded-lg hover:bg-muted/60 transition-colors"
            aria-label="Open menu"
          >
            <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
              <path d="M0 1h20M0 7h20M0 13h20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute right-0 top-0 h-full w-[85%] max-w-[360px] bg-white shadow-2xl flex flex-col"
            style={{ animation: "slideInRight 280ms cubic-bezier(0.16, 1, 0.3, 1)" }}
          >
            <div className="flex justify-between items-center p-5 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange flex items-center justify-center text-white font-serif font-bold text-sm">
                  C
                </div>
                <span className="font-serif text-[18px] font-semibold">Constrat</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted/60"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3">
              {links.map((l) => {
                const active = path === l.to || (l.to !== "/" && path.startsWith(l.to));
                return (
                  <Link
                    key={l.label}
                    to={l.to}
                    className={`flex items-center h-[52px] px-6 text-[15px] font-medium border-l-2 transition-colors ${
                      active
                        ? "text-orange border-orange bg-orange-tint/50"
                        : "text-text-primary border-transparent hover:bg-muted/40"
                    }`}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </div>

            <div className="p-5 border-t border-border space-y-2.5">
              {user ? (
                <button
                  onClick={() => { signOut(); setOpen(false); }}
                  className="w-full h-11 flex items-center justify-center border border-border rounded-lg text-[14px] font-medium hover:border-orange hover:text-orange transition-colors"
                >
                  Logout
                </button>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="w-full h-11 flex items-center justify-center border border-border rounded-lg text-[14px] font-medium"
                  >
                    Login
                  </Link>
                  <Link
                    to="/join"
                    className="w-full h-11 flex items-center justify-center bg-orange text-white rounded-lg text-[14px] font-semibold"
                  >
                    Join Constrat
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
