import { Link, useRouterState } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const PUBLIC_LINKS = [
  { label: "Practice", to: "/practice" },
  { label: "News", to: "/news" },
  { label: "Companies", to: "/events" }, // /events houses Companies + Competitions
  { label: "Leaderboard", to: "/leaderboard" },
  { label: "Analytics", to: "/analytics" },
];

const ADMIN_LINKS = [
  { label: "Timetable", to: "/timetable" },
  { label: "Deadlines", to: "/deadlines" },
  { label: "Alumni", to: "/alumni" },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, isAdmin, signOut } = useAuth();

  const links = isAdmin ? [...PUBLIC_LINKS, ...ADMIN_LINKS] : PUBLIC_LINKS;

  useEffect(() => {
    if (!user || !supabase) {
      setAvatarUrl("");
      setDisplayName("");
      return;
    }
    let cancelled = false;
    supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        setAvatarUrl(data.avatar_url || "");
        setDisplayName(
          (data.full_name || "").trim() ||
            user.email?.split("@")[0] ||
            "Profile",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => setOpen(false), [path]);

  return (
    <>
      <header
        className="fixed top-0 inset-x-0 z-50 h-[64px] bg-white"
        style={{ borderBottom: "1px solid #e2e8f0" }}
      >
        <div className="mx-auto max-w-[1280px] h-full px-5 md:px-6 flex items-center justify-between">
          {/* Wordmark only — no icon */}
          <Link
            to={user ? "/dashboard" : "/"}
            className="text-[16px] font-bold tracking-tight text-[#0a1628] hover:text-[#0a1628]"
            style={{ letterSpacing: "-0.02em" }}
          >
            Constrat
          </Link>

          {/* Desktop nav — center */}
          <nav className="hidden lg:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            {links.map((l, i) => {
              const active = path === l.to || (l.to !== "/" && path.startsWith(l.to));
              return (
                <span key={l.label} className="flex items-center">
                  {i > 0 && (
                    <span className="text-[#c8d8e8] text-[10px] mx-1">·</span>
                  )}
                  <Link
                    to={l.to}
                    className={`relative px-3 py-2 text-[13px] font-normal transition-colors ${
                      active
                        ? "text-[#0a1628]"
                        : "text-[#8a9bb0] hover:text-[#0a1628]"
                    }`}
                    style={{ letterSpacing: "-0.005em" }}
                  >
                    {l.label}
                    {active && (
                      <span
                        className="absolute left-3 right-3 -bottom-0.5 h-[2px] bg-[#e8490f]"
                      />
                    )}
                  </Link>
                </span>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="hidden lg:flex items-center gap-3">
            {user && (
              <Link
                to="/upgrade"
                className="h-7 px-3 inline-flex items-center text-[11px] font-bold rounded-full bg-[#e8490f] text-white hover:bg-[#c03a08] transition-colors uppercase tracking-[0.06em]"
              >
                ★ Pro
              </Link>
            )}

            {user && isAdmin && (
              <Link
                to="/admin"
                className="h-7 px-3 inline-flex items-center text-[11px] font-semibold rounded-full bg-[#0a1628] text-white hover:bg-[#162236] transition-colors uppercase tracking-[0.06em]"
              >
                Admin
              </Link>
            )}

            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/account"
                  className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center font-semibold text-[11px] hover:ring-2 ring-[#e8490f]/30 transition-all"
                  style={{ background: "#fdf0eb", color: "#c03a08" }}
                  title={displayName || user.email || "Profile"}
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName || "Profile"}
                      className="w-full h-full object-cover"
                      onError={() => setAvatarUrl("")}
                    />
                  ) : (
                    <span>{initials(displayName || user.email || "U")}</span>
                  )}
                </Link>
                <button
                  onClick={() => signOut()}
                  className="text-[11px] text-[#8a9bb0] hover:text-[#0a1628] transition-colors uppercase tracking-[0.06em] font-semibold"
                >
                  Logout
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-[13px] text-[#0a1628] font-medium hover:text-[#e8490f] transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/join"
                  className="h-8 px-4 inline-flex items-center text-[12px] font-semibold rounded-full bg-[#e8490f] text-white hover:bg-[#c03a08] transition-colors"
                >
                  Join Free →
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen(!open)}
            className="lg:hidden w-9 h-9 flex items-center justify-center text-[#0a1628]"
            aria-label="Toggle menu"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              {open ? (
                <>
                  <path d="M3 3l12 12M15 3L3 15" stroke="currentColor" strokeWidth="1.5" />
                </>
              ) : (
                <>
                  <path d="M2 5h14M2 9h14M2 13h14" stroke="currentColor" strokeWidth="1.5" />
                </>
              )}
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile sheet */}
      {open && (
        <div className="lg:hidden fixed top-[64px] inset-x-0 bottom-0 z-40 bg-white" style={{ borderTop: "1px solid #e2e8f0" }}>
          <nav className="px-5 py-6 flex flex-col">
            {links.map((l) => {
              const active = path === l.to || (l.to !== "/" && path.startsWith(l.to));
              return (
                <Link
                  key={l.label}
                  to={l.to}
                  className={`py-3 text-[15px] border-b border-[#e2e8f0] transition-colors ${
                    active ? "text-[#e8490f] font-semibold" : "text-[#0a1628]"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
            <div className="mt-6 flex flex-col gap-3">
              {user ? (
                <>
                  <Link to="/dashboard" className="btn-dark">
                    Dashboard
                  </Link>
                  <Link to="/account" className="btn-secondary">
                    Profile
                  </Link>
                  <button onClick={() => signOut()} className="btn-secondary">
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn-secondary">
                    Login
                  </Link>
                  <Link to="/join" className="btn-primary">
                    Join Free →
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}

      {/* Spacer so content doesn't hide behind the fixed nav */}
      <div className="h-[64px]" />
    </>
  );
}

function initials(name: string): string {
  return (name || "U")
    .split(/\s+/)
    .filter(Boolean)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
