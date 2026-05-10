import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell, PageHeader } from "@/components/PageShell";
import { AnimatedSection } from "@/components/AnimatedSection";
import { GlowCard } from "@/components/GlowCard";

export const Route = createFileRoute("/alumni")({
  component: Alumni,
});

const BATCHES = ["All", "2025 (Current)", "2024 (Seniors)"];

const ALUMNI = [
  { name: "Priyansh Mehta", batch: "2024 (Seniors)", designation: "Core Member" },
  { name: "Kalloljyoti Ojah", batch: "2024 (Seniors)", designation: "Core Member" },
  { name: "Anshul Sharma", batch: "2024 (Seniors)", designation: "Core Member" },
  { name: "Sachin", batch: "2024 (Seniors)", designation: "Core Member" },
  { name: "Tanya", batch: "2024 (Seniors)", designation: "Core Member" },
  { name: "Sanvi", batch: "2024 (Seniors)", designation: "Core Member" },
  { name: "Dev", batch: "2024 (Seniors)", designation: "Core Member" },
  { name: "Jainishha Sethia", batch: "2025 (Current)", designation: "Core Team" },
  { name: "Adesh", batch: "2025 (Current)", designation: "Core Team" },
  { name: "Satyam", batch: "2025 (Current)", designation: "Core Team" },
  { name: "Aheli", batch: "2025 (Current)", designation: "Core Team" },
  { name: "Shambhavi", batch: "2025 (Current)", designation: "Core Team" },
  { name: "Sagni", batch: "2025 (Current)", designation: "Core Team" },
  { name: "Divyanshi", batch: "2025 (Current)", designation: "Core Team" },
];

function Alumni() {
  const [batch, setBatch] = useState("All");
  const [q, setQ] = useState("");

  const filtered = ALUMNI.filter((a) => {
    if (batch !== "All" && a.batch !== batch) return false;
    if (q && !a.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <PageShell>
      <PageHeader
        eyebrow="CaseReady Family"
        title="The people behind CaseReady."
        subtitle="Alumni, current members, and their journeys. Editable by verified members."
        alt
      />

      <div className="sticky top-16 z-30 glass border-b border-border">
        <div className="mx-auto max-w-[1180px] px-5 md:px-6 py-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-[0.08em] font-semibold text-text-muted">Batch:</span>
            <div className="flex gap-1.5 scroll-pills">
              {BATCHES.map((b) => (
                <button
                  key={b}
                  onClick={() => setBatch(b)}
                  className="px-3 h-7 rounded-full text-[12px] border whitespace-nowrap transition-colors"
                  style={
                    batch === b
                      ? { background: "#E8490F", color: "#fff", borderColor: "#E8490F" }
                      : { background: "#fff", color: "#5C5C5A", borderColor: "#E8E4DE" }
                  }
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name..."
            className="input-base w-full md:w-[240px] md:ml-auto"
          />
        </div>
      </div>

      <section className="bg-background">
        <div className="mx-auto max-w-[1180px] px-5 md:px-6 py-10 md:py-14">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((a, i) => (
              <AnimatedSection key={a.name} delay={i * 50}>
                <GlowCard className="p-5 h-full">
                  <div className="relative z-10">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center font-semibold text-[14px] shrink-0"
                        style={{
                          background: a.batch.includes("Current") ? "#FFF0EB" : "#F3F2EF",
                          color: a.batch.includes("Current") ? "#C03A08" : "#5C5C5A",
                        }}
                      >
                        {a.name.split(" ").map((s) => s[0]).join("").slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[15px] font-semibold leading-tight truncate">{a.name}</p>
                        <p className="text-[12px] text-text-muted">{a.designation}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-1.5 flex-wrap">
                      <span className={`pill ${a.batch.includes("Current") ? "pill-orange" : ""}`}>
                        {a.batch.includes("Current") ? "Current" : "Alumni 24"}
                      </span>
                    </div>
                  </div>
                </GlowCard>
              </AnimatedSection>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-20 text-text-muted">
              <p>No members found matching your filters.</p>
            </div>
          )}

          <AnimatedSection delay={300}>
            <div className="mt-14 card-base p-6 md:p-8 grid grid-cols-2 md:grid-cols-4 gap-6 divide-y md:divide-y-0 md:divide-x divide-border">
              <Stat label="Senior Alumni" value="7" />
              <Stat label="Current Team" value="7" />
              <Stat label="Batches" value="2" />
              <Stat label="Total Members" value="14" />
            </div>
          </AnimatedSection>
        </div>
      </section>
    </PageShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3 md:py-0 text-center md:text-left">
      <p className="label-eyebrow">{label}</p>
      <p className="mt-2 font-serif font-semibold text-[28px] text-text-primary">{value}</p>
    </div>
  );
}
