import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell, PageHeader } from "@/components/PageShell";

export const Route = createFileRoute("/events")({
  component: Events,
  head: () => ({
    meta: [
      { title: "Events — Constrat" },
      {
        name: "description",
        content: "Upcoming case competitions, workshops, and speaker sessions.",
      },
    ],
  }),
});

const UPCOMING = [
  {
    name: "Constrat Case Open 2026",
    date: "May 22",
    venue: "Main Auditorium",
    type: "Case Competition",
    desc: "Inter-batch flagship case competition. ₹1.2L prize pool.",
    time: "6:00 PM",
  },
  {
    name: "BCG Practice Workshop",
    date: "May 28",
    venue: "Seminar Hall 2",
    type: "Workshop",
    desc: "Live problem structuring with two BCG associates from the Mumbai office.",
    time: "4:00 PM",
  },
  {
    name: "Speaker · Partner @ Bain",
    date: "Jun 04",
    venue: "Online (Zoom)",
    type: "Speaker Session",
    desc: "Career arc, what Bain looks for, live Q&A with the cohort.",
    time: "7:00 PM",
  },
  {
    name: "GD Marathon Night",
    date: "Jun 09",
    venue: "Block C Lounge",
    type: "Social",
    desc: "8 GDs, two evaluators, dinner included. RSVP capped at 60.",
    time: "6:30 PM",
  },
];

const PAST = [
  {
    name: "Strategy Sprint 2026",
    date: "Apr 12",
    participants: 142,
    recap: "Team Tigris won with a 14-slide retail growth deck.",
  },
  {
    name: "Goldman SIP Prep AMA",
    date: "Mar 30",
    participants: 78,
    recap: "Fund-flow walkthroughs + live mock interview.",
  },
  {
    name: "Constrat Welcome Mixer",
    date: "Aug 10, 2025",
    participants: 220,
    recap: "New batch onboarding + senior speed-mentoring.",
  },
];

function generateICS(event: (typeof UPCOMING)[0]) {
  const year = 2026;
  const monthMap: Record<string, string> = {
    Jan: "01",
    Feb: "02",
    Mar: "03",
    Apr: "04",
    May: "05",
    Jun: "06",
    Jul: "07",
    Aug: "08",
    Sep: "09",
    Oct: "10",
    Nov: "11",
    Dec: "12",
  };
  const [mon, day] = event.date.split(" ");
  const dateStr = `${year}${monthMap[mon] || "05"}${day.padStart(2, "0")}`;
  const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:${dateStr}T180000\nDTEND:${dateStr}T200000\nSUMMARY:${event.name}\nLOCATION:${event.venue}\nDESCRIPTION:${event.desc}\nEND:VEVENT\nEND:VCALENDAR`;
  const blob = new Blob([ics], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${event.name.replace(/\s+/g, "_")}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

function Events() {
  const [tab, setTab] = useState<"up" | "past">("up");
  const [registered, setRegistered] = useState<Set<string>>(new Set());
  const featured = UPCOMING[0];

  function handleRegister(name: string) {
    setRegistered((prev) => {
      const s = new Set(prev);
      s.add(name);
      return s;
    });
  }

  return (
    <PageShell>
      <PageHeader eyebrow="Events" title="What Constrat is building. What we've already done.">
        <div className="flex gap-6 border-b border-border -mb-2">
          <button
            onClick={() => setTab("up")}
            className="pb-3 text-[14px] font-medium relative"
            style={{ color: tab === "up" ? "#E8490F" : "#5C5C5A" }}
          >
            Upcoming Events{" "}
            {tab === "up" && (
              <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-orange" />
            )}
          </button>
          <button
            onClick={() => setTab("past")}
            className="pb-3 text-[14px] font-medium relative"
            style={{ color: tab === "past" ? "#E8490F" : "#5C5C5A" }}
          >
            Past Events{" "}
            {tab === "past" && (
              <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-orange" />
            )}
          </button>
        </div>
      </PageHeader>

      {tab === "up" ? (
        <section className="bg-background">
          <div className="mx-auto max-w-[1180px] px-6 py-14">
            <div
              className="p-8 rounded-[16px]"
              style={{ background: "#FFF0EB", border: "1px solid #E8C4B0" }}
            >
              <span className="pill pill-orange">{featured.type}</span>
              <h2 className="mt-3 font-serif text-[36px] leading-[1.1] tracking-[-0.025em]">
                {featured.name}
              </h2>
              <p className="mt-3 text-[15px] text-text-secondary">
                {featured.date} · {featured.time} · {featured.venue}
              </p>
              <p className="mt-4 text-[15px] text-text-secondary max-w-[640px]">{featured.desc}</p>
              <div className="mt-6 flex gap-3 flex-wrap">
                {registered.has(featured.name) ? (
                  <span className="btn-primary opacity-70 cursor-default">✓ Registered</span>
                ) : (
                  <button className="btn-primary" onClick={() => handleRegister(featured.name)}>
                    Register Now →
                  </button>
                )}
                <button className="btn-secondary" onClick={() => generateICS(featured)}>
                  Add to Calendar
                </button>
              </div>
            </div>

            <div className="mt-12 grid md:grid-cols-3 gap-6">
              {UPCOMING.slice(1).map((e) => (
                <article key={e.name} className="card-base p-6">
                  <span className="pill">{e.type}</span>
                  <h3 className="mt-3 text-[18px] font-semibold leading-[1.3]">{e.name}</h3>
                  <p className="mt-2 text-[13px] text-text-secondary">
                    {e.date} · {e.venue}
                  </p>
                  <p className="mt-3 text-[14px] text-text-secondary leading-[1.55]">{e.desc}</p>
                  <div className="mt-4 flex gap-2 flex-wrap">
                    {registered.has(e.name) ? (
                      <span className="text-[13px] text-success font-semibold">✓ Registered</span>
                    ) : (
                      <button
                        className="btn-ghost text-[13px]"
                        onClick={() => handleRegister(e.name)}
                      >
                        Register →
                      </button>
                    )}
                    <button
                      className="text-[12px] text-text-muted hover:text-orange transition-colors"
                      onClick={() => generateICS(e)}
                    >
                      📅 Calendar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="bg-background">
          <div className="mx-auto max-w-[1180px] px-6 py-14 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PAST.map((e) => (
              <article key={e.name} className="card-base p-6">
                <h3 className="text-[18px] font-semibold leading-[1.3]">{e.name}</h3>
                <p className="mt-1 text-[13px] text-text-muted">
                  {e.date} · {e.participants} participants
                </p>
                <p className="mt-3 text-[14px] text-text-secondary leading-[1.55]">{e.recap}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </PageShell>
  );
}
