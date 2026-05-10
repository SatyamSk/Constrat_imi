import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell, PageHeader } from "@/components/PageShell";
import { AnimatedSection } from "@/components/AnimatedSection";
import { GlowCard } from "@/components/GlowCard";

export const Route = createFileRoute("/deadlines")({
  component: Deadlines,
});

const DEADLINES_DATA = [
  {
    title: "Summer Internship Preference Form",
    deadline: "2026-05-12",
    source: "Placement",
    batch: "2027",
    relevance: "All Sections",
    urgency: "high",
    description:
      "Fill your SIP company preferences by priority. Late submissions will not be considered.",
  },
  {
    title: "Resume Review - Final Submission",
    deadline: "2026-05-15",
    source: "Placement",
    batch: "2027",
    relevance: "All Sections",
    urgency: "high",
    description: "Submit your final placement resume in the prescribed format. No extensions.",
  },
  {
    title: "Mock GD Registration",
    deadline: "2026-05-18",
    source: "Constrat",
    batch: "All",
    relevance: "All Sections",
    urgency: "medium",
    description: "Register for the Constrat Mock GD marathon. Slots are limited to 60.",
  },
  {
    title: "Corporate Presentation - Deloitte",
    deadline: "2026-05-20",
    source: "Placement",
    batch: "2026",
    relevance: "Consulting, Strategy",
    urgency: "low",
    description:
      "Attend the pre-placement talk by Deloitte S&O. Mandatory for shortlisted candidates.",
  },
  {
    title: "Elective Bidding Round 2",
    deadline: "2026-05-22",
    source: "Academics",
    batch: "2027",
    relevance: "All Sections",
    urgency: "medium",
    description: "Second round of elective bidding. Check registro for available credits.",
  },
];

function getDaysLeft(date: string) {
  const diff = new Date(date).getTime() - new Date().getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function Deadlines() {
  const [filter, setFilter] = useState("All");
  const filters = ["All", "Placement", "Constrat", "Academics"];

  const filtered = DEADLINES_DATA.filter((d) => filter === "All" || d.source === filter).sort(
    (a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime(),
  );

  return (
    <PageShell>
      <PageHeader
        eyebrow="Critical Deadlines"
        title="Never miss what matters."
        subtitle="Stay on top of every important deadline. Filtered for your batch and section."
        alt
      >
        <div className="flex items-center gap-3 text-[13px] text-text-secondary">
          <span className="pulse-dot" />
          <span>For IMI students only</span>
        </div>
      </PageHeader>

      {/* Filter bar */}
      <div className="sticky top-16 z-30 glass border-b border-border">
        <div className="mx-auto max-w-[1180px] px-5 md:px-6 py-4 flex flex-wrap items-center gap-3">
          <span className="label-eyebrow">Source:</span>
          <div className="flex gap-1.5 scroll-pills">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 h-8 rounded-full text-[12px] font-medium border whitespace-nowrap transition-colors"
                style={
                  filter === f
                    ? { background: "#E8490F", color: "#fff", borderColor: "#E8490F" }
                    : { background: "#fff", color: "#5C5C5A", borderColor: "#E8E4DE" }
                }
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="bg-background">
        <div className="mx-auto max-w-[1180px] px-5 md:px-6 py-10 md:py-14">
          {/* Urgent banner */}
          {filtered.some((d) => getDaysLeft(d.deadline) <= 3 && getDaysLeft(d.deadline) >= 0) && (
            <AnimatedSection>
              <div className="mb-8 p-5 rounded-2xl bg-urgent-bg border border-urgent/20 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-urgent/10 flex items-center justify-center text-urgent text-lg shrink-0">
                  &#x1F525;
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-urgent">
                    Urgent deadlines approaching
                  </p>
                  <p className="text-[13px] text-text-secondary mt-0.5">
                    {
                      filtered.filter(
                        (d) => getDaysLeft(d.deadline) <= 3 && getDaysLeft(d.deadline) >= 0,
                      ).length
                    }{" "}
                    deadline(s) within the next 3 days.
                  </p>
                </div>
              </div>
            </AnimatedSection>
          )}

          <div className="space-y-4">
            {filtered.map((d, i) => {
              const daysLeft = getDaysLeft(d.deadline);
              const isUrgent = daysLeft <= 3 && daysLeft >= 0;
              const isPast = daysLeft < 0;
              return (
                <AnimatedSection key={d.title} delay={i * 60}>
                  <GlowCard className={`p-5 md:p-6 ${isPast ? "opacity-50" : ""}`}>
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-4">
                      <div
                        className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl flex flex-col items-center justify-center shrink-0 ${isPast ? "bg-muted" : isUrgent ? "bg-urgent-bg" : "bg-orange-tint"}`}
                      >
                        <span
                          className={`text-[24px] md:text-[28px] font-serif font-bold leading-none ${isPast ? "text-text-muted" : isUrgent ? "text-urgent" : "text-orange"}`}
                        >
                          {isPast ? "\u2014" : daysLeft}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider font-medium text-text-muted mt-0.5">
                          {isPast ? "past" : daysLeft === 1 ? "day" : "days"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`pill ${d.source === "Placement" ? "pill-red" : d.source === "Constrat" ? "pill-orange" : "pill-blue"}`}
                          >
                            {d.source}
                          </span>
                          <span className="pill">
                            {d.batch === "All" ? "All Batches" : `Batch ${d.batch}`}
                          </span>
                          {isUrgent && !isPast && <span className="pill pill-red">Urgent</span>}
                        </div>
                        <h3 className="mt-2 text-[16px] md:text-[17px] font-semibold leading-tight">
                          {d.title}
                        </h3>
                        <p className="mt-1.5 text-[13px] text-text-secondary leading-relaxed">
                          {d.description}
                        </p>
                        <p className="mt-2 text-[12px] text-text-muted">
                          Due:{" "}
                          {new Date(d.deadline).toLocaleDateString("en-IN", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                          {" \u00b7 "}
                          {d.relevance}
                        </p>
                      </div>
                    </div>
                  </GlowCard>
                </AnimatedSection>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-20 text-text-muted">
              <p className="text-[16px]">No deadlines found for this filter.</p>
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}
