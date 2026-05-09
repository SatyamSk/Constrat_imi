import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell, PageHeader } from "@/components/PageShell";

export const Route = createFileRoute("/timetable")({
  component: Timetable,
  head: () => ({
    meta: [
      { title: "Timetable — Constrat" },
      { name: "description", content: "Class timetable for IMI Delhi students. Section filters and alerts." },
      { property: "og:title", content: "Timetable — Constrat" },
      { property: "og:description", content: "Always know what's next." },
    ],
  }),
});

const SECTIONS = ["A", "B", "C", "D"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SLOTS = ["08:30", "10:00", "11:30", "14:00", "15:30"];

const SCHEDULE: Record<string, { course: string; faculty: string; room: string; tag?: string }> = {
  "Mon-08:30": { course: "Strategic Management", faculty: "Prof. Banerjee", room: "Room 204" },
  "Mon-10:00": { course: "Operations Mgmt", faculty: "Prof. Khurana", room: "Room 311" },
  "Mon-14:00": { course: "Marketing Research", faculty: "Prof. Iyer", room: "Seminar Hall", tag: "Moved" },
  "Tue-10:00": { course: "Financial Reporting", faculty: "Prof. Joshi", room: "Room 204" },
  "Tue-11:30": { course: "HR Analytics", faculty: "Prof. Rao", room: "Room 110" },
  "Wed-08:30": { course: "Strategic Management", faculty: "Prof. Banerjee", room: "Room 204" },
  "Wed-15:30": { course: "Consulting Lab", faculty: "Prof. Mehta", room: "C-Lab" },
  "Thu-10:00": { course: "Operations Mgmt", faculty: "Prof. Khurana", room: "Room 311" },
  "Thu-14:00": { course: "Marketing Research", faculty: "Prof. Iyer", room: "Seminar Hall" },
  "Fri-08:30": { course: "Financial Reporting", faculty: "Prof. Joshi", room: "Room 204" },
  "Fri-11:30": { course: "Business Ethics", faculty: "Prof. Sundaram", room: "Room 110", tag: "Guest" },
  "Sat-10:00": { course: "Make-up · Strategy", faculty: "Prof. Banerjee", room: "Room 204", tag: "Make-up" },
};

const ALERTS = [
  { when: "Today 12:18 PM", title: "Slot 3 venue changed", body: "Marketing Research moved Room 204 → Seminar Hall.", type: "venue" },
  { when: "Today 9:42 AM", title: "Faculty substitution", body: "Business Ethics — Prof. Sundaram replaces Prof. Pillai for Fri 11:30.", type: "faculty" },
  { when: "Yesterday 6:10 PM", title: "Make-up class added", body: "Saturday 10:00, Strategic Management, Room 204.", type: "added" },
  { when: "Yesterday 11:05 AM", title: "Class cancelled", body: "Wed 11:30 HR Analytics cancelled by faculty.", type: "cancelled" },
];

function Timetable() {
  const [sec, setSec] = useState("B");

  return (
    <PageShell>
      <PageHeader
        eyebrow="Live Timetable"
        title="Always know what's next."
        subtitle="Class timetable for IMI Delhi. Filter by section. Get alerts on changes."
        alt
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 text-[13px] text-success">
            <span className="pulse-dot" />
            Live
          </span>
          <span className="text-[13px] text-text-secondary">·</span>
          <span className="text-[13px] text-text-secondary">For IMI students</span>
        </div>
      </PageHeader>

      {/* Section selector */}
      <div className="sticky top-16 z-30 bg-surface border-b border-border">
        <div className="mx-auto max-w-[1180px] px-6 py-4 flex flex-wrap items-center gap-3">
          <span className="label-eyebrow">Section</span>
          <div className="flex gap-1.5">
            {SECTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setSec(s)}
                className="w-9 h-9 rounded-md text-[13px] font-semibold border"
                style={
                  sec === s
                    ? { background: "#E8490F", color: "#fff", borderColor: "#E8490F" }
                    : { background: "#fff", color: "#5C5C5A", borderColor: "#E8E4DE" }
                }
              >
                {s}
              </button>
            ))}
          </div>
          <span className="ml-auto text-[12px] text-text-muted">Week of May 5–10, 2026</span>
          <button className="btn-secondary h-9 px-4 text-[13px]">Subscribe to Telegram alerts</button>
        </div>
      </div>

      {/* Grid */}
      <section className="bg-background">
        <div className="mx-auto max-w-[1180px] px-6 py-12 grid lg:grid-cols-[1fr_320px] gap-10">
          <div className="card-base overflow-hidden">
            <div className="grid" style={{ gridTemplateColumns: `90px repeat(${DAYS.length}, 1fr)` }}>
              <div className="bg-muted/40 border-b border-r border-border" />
              {DAYS.map((d) => (
                <div key={d} className="bg-muted/40 border-b border-r border-border last:border-r-0 px-3 py-3 text-[12px] uppercase tracking-[0.08em] font-semibold text-text-secondary">
                  {d}
                </div>
              ))}
              {SLOTS.map((slot) => (
                <Row key={slot} slot={slot} sec={sec} />
              ))}
            </div>
          </div>

          {/* Alerts panel */}
          <aside className="space-y-6">
            <div className="card-base p-5">
              <div className="flex items-center justify-between">
                <p className="label-eyebrow">Recent Alerts · Sec {sec}</p>
                <span className="text-[11px] text-success font-semibold">LIVE</span>
              </div>
              <ul className="mt-4 space-y-4">
                {ALERTS.map((a, i) => (
                  <li
                    key={i}
                    className="pl-3 py-1"
                    style={{ borderLeft: `3px solid ${a.type === "cancelled" ? "#B91C1C" : a.type === "venue" ? "#E8490F" : "#1E6640"}` }}
                  >
                    <p className="text-[13px] font-semibold">{a.title}</p>
                    <p className="text-[13px] text-text-secondary mt-0.5">{a.body}</p>
                    <p className="text-[11px] text-text-muted mt-1">{a.when}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card-base p-5">
              <p className="label-eyebrow">Get Alerts</p>
              <p className="mt-3 text-[13px] text-text-secondary">
                Stay updated on any timetable changes for your section.
              </p>
              <button className="btn-primary mt-4 h-10 px-4 text-[13px]">Subscribe to Alerts</button>
            </div>
          </aside>
        </div>
      </section>
    </PageShell>
  );
}

function Row({ slot, sec: _sec }: { slot: string; sec: string }) {
  return (
    <>
      <div className="border-b border-r border-border px-3 py-4 text-[12px] text-text-muted font-mono">{slot}</div>
      {DAYS.map((d) => {
        const cls = SCHEDULE[`${d}-${slot}`];
        return (
          <div key={d + slot} className="border-b border-r border-border last:border-r-0 p-2 min-h-[88px]">
            {cls ? (
              <div
                className="h-full rounded-[8px] p-3 text-[12px]"
                style={
                  cls.tag === "Moved" || cls.tag === "Make-up"
                    ? { background: "#FFF0EB", borderLeft: "3px solid #E8490F" }
                    : { background: "#FAFAF8", borderLeft: "3px solid #E8E4DE" }
                }
              >
                <p className="font-semibold text-text-primary leading-tight">{cls.course}</p>
                <p className="text-text-secondary mt-1">{cls.faculty}</p>
                <p className="text-text-muted mt-0.5">{cls.room}</p>
                {cls.tag && (
                  <span
                    className="mt-2 inline-block pill pill-orange"
                    style={{ fontSize: 10, padding: "2px 6px" }}
                  >
                    {cls.tag}
                  </span>
                )}
              </div>
            ) : null}
          </div>
        );
      })}
    </>
  );
}
