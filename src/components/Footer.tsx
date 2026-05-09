import { Link } from "@tanstack/react-router";

const platformLinks = [
  { label: "Practice", to: "/practice" },
  { label: "Cases", to: "/cases" },
  { label: "News", to: "/news" },
  { label: "Timetable", to: "/timetable" },
];

const communityLinks = [
  { label: "Events", to: "/events" },
  { label: "Alumni", to: "/alumni" },
  { label: "Leaderboard", to: "/leaderboard" },
  { label: "Deadlines", to: "/deadlines" },
  { label: "Join", to: "/join" },
];

export function Footer() {
  return (
    <footer className="gradient-cta text-white/80">
      <div className="mx-auto max-w-[1180px] px-5 md:px-6 py-14 md:py-16 grid md:grid-cols-4 gap-10">
        {/* Brand */}
        <div className="md:col-span-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange flex items-center justify-center text-white font-serif font-bold text-sm">
              C
            </div>
            <span className="font-serif text-[18px] text-white font-semibold">Constrat</span>
          </div>
          <p className="text-[12px] text-white/40 mt-3 leading-relaxed">
            Consulting & Strategy Club<br />
            International Management Institute, Delhi
          </p>
        </div>

        {/* Platform */}
        <div>
          <p className="text-[11px] uppercase tracking-[0.1em] font-semibold text-white/40 mb-4">Platform</p>
          <div className="flex flex-col gap-2.5 text-[13px]">
            {platformLinks.map((l) => (
              <Link key={l.label} to={l.to} className="hover:text-orange transition-colors w-fit">
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Community */}
        <div>
          <p className="text-[11px] uppercase tracking-[0.1em] font-semibold text-white/40 mb-4">Community</p>
          <div className="flex flex-col gap-2.5 text-[13px]">
            {communityLinks.map((l) => (
              <Link key={l.label} to={l.to} className="hover:text-orange transition-colors w-fit">
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Connect */}
        <div>
          <p className="text-[11px] uppercase tracking-[0.1em] font-semibold text-white/40 mb-4">Connect</p>
          <div className="flex flex-col gap-3">
            <a
              href="#"
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-[13px] font-medium w-fit"
              style={{ background: "#FFF0EB", color: "#C03A08" }}
            >
              Join Telegram →
            </a>
            <div className="flex gap-2">
              <a href="#" className="w-9 h-9 rounded-lg border border-white/15 flex items-center justify-center text-white/60 hover:text-orange hover:border-orange transition-colors text-[12px]">
                IG
              </a>
              <a href="#" className="w-9 h-9 rounded-lg border border-white/15 flex items-center justify-center text-white/60 hover:text-orange hover:border-orange transition-colors text-[12px]">
                Li
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/8">
        <div className="mx-auto max-w-[1180px] px-5 md:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-white/30">
          <span>© {new Date().getFullYear()} Constrat · IMI Delhi</span>
          <span>Built for the MBA community worldwide</span>
        </div>
      </div>
    </footer>
  );
}
