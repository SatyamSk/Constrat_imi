import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PageShell, PageHeader } from "@/components/PageShell";
import { GlowCard } from "@/components/GlowCard";
import { AnimatedSection } from "@/components/AnimatedSection";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { requireAdmin } from "@/lib/requireAdmin";

export const Route = createFileRoute("/timetable")({
  beforeLoad: requireAdmin,
  component: Timetable,
});

interface Entry {
  id?: string;
  section: string;
  day: string;
  slot: string;
  course: string;
  faculty: string;
  room: string;
}

function Timetable() {
  const [sec, setSec] = useState("A");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQ, setSearchQ] = useState("");

  const loadTimetable = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    try {
      // First try to sync from API if available
      try {
        const r = await fetch("/api/timetable_sync");
        const j = await r.json();
        if (!j.success) console.log("Sync not available");
        // Wait for sync to complete
        await new Promise((resolve) => setTimeout(resolve, 800));
      } catch {}

      // Always fetch from Supabase
      const { data, error } = await supabase
        .from("timetable")
        .select("*")
        .order("day")
        .order("slot");

      if (error) {
        console.error("Timetable error:", error);
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        setEntries(data as Entry[]);
        console.log("Loaded " + data.length + " timetable entries");
      } else {
        console.log("No timetable entries found");
      }
    } catch (err) {
      console.error("Error loading timetable:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTimetable();

    // Subscribe to changes
    if (!isSupabaseConfigured || !supabase) return;
    const sub = supabase
      .channel("timetable_updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "timetable" }, () => {
        loadTimetable();
      })
      .subscribe();

    return () => {
      sub.unsubscribe();
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTimetable();
  };

  const sections = [...new Set(entries.map((e) => e.section))].sort();
  const filtered = entries
    .filter((e) => e.section === sec)
    .filter(
      (e) =>
        !searchQ ||
        e.course.toLowerCase().includes(searchQ.toLowerCase()) ||
        e.faculty.toLowerCase().includes(searchQ.toLowerCase()),
    );

  // Group by day
  const byDay = filtered.reduce<Record<string, Entry[]>>((acc, e) => {
    const key = e.day;
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});
  const days = Object.keys(byDay);

  // Unique slots for grid
  const allSlots = [...new Set(filtered.map((e) => e.slot))].sort();

  // Today's classes
  const now = new Date();
  const todayStr = now.toLocaleDateString("en-US", { weekday: "long" });
  const todayClasses = filtered.filter((e) =>
    e.day.toLowerCase().includes(todayStr.toLowerCase().slice(0, 3)),
  );

  return (
    <PageShell>
      <PageHeader
        eyebrow="IMI Delhi"
        title="Live Timetable"
        subtitle="Synced from college academic calendar. Updated daily."
      />
      <div className="mx-auto max-w-[1180px] px-5 md:px-6 -mt-4 pb-20">
        {/* Today's classes highlight */}
        {todayClasses.length > 0 && (
          <GlowCard className="p-5 md:p-6 mb-8" style={{ borderColor: "rgba(232,73,15,0.3)" }}>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <span className="pulse-dot" />
                <span className="text-[15px] font-semibold" style={{ color: "#E8490F" }}>
                  Today — {todayStr}
                </span>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {todayClasses.map((c, i) => (
                  <div key={i} className="p-3 rounded-lg bg-orange-tint/50 border border-orange/10">
                    <p
                      className="text-[11px] font-mono font-semibold text-orange"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {c.slot}
                    </p>
                    <p className="text-[15px] font-semibold mt-1">{c.course}</p>
                    <p className="text-[12px] text-text-muted">
                      {c.faculty} · {c.room}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </GlowCard>
        )}

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Section pills */}
          <div className="flex gap-1 p-1 rounded-lg bg-muted/60">
            {(sections.length > 0 ? sections : ["A", "B", "C", "D"]).map((s) => (
              <button
                key={s}
                onClick={() => setSec(s)}
                className={`px-4 py-1.5 rounded-md text-[15px] font-semibold transition-all ${sec === s ? "text-orange shadow-sm" : "text-text-muted hover:text-text-primary"}`}
              >
                Sec {s}
              </button>
            ))}
          </div>
          <input
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Search course or faculty..."
            className="input-base h-9 text-[12px] flex-1 min-w-[180px]"
          />
          <div className="flex gap-1">
            {(["grid", "list"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${viewMode === m ? "bg-orange text-white" : "text-text-muted"}`}
              >
                {m === "grid" ? "Grid" : "List"}
              </button>
            ))}
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3 py-1.5 rounded-md text-[12px] font-medium bg-orange/10 text-orange hover:bg-orange/20 transition-all disabled:opacity-50"
          >
            {refreshing ? "Syncing..." : "Sync"}
          </button>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="card-base p-5 h-28 shimmer rounded-xl" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="card-base p-12 text-center">
            <p className="text-[15px] font-semibold mb-2">No timetable data yet</p>
            <p className="text-[15px] text-text-muted">
              The timetable syncs from Google Sheets daily. Check back soon.
            </p>
          </div>
        ) : viewMode === "grid" ? (
          /* Grid view — grouped by day */
          <div className="space-y-6">
            {days.map((day) => (
              <AnimatedSection key={day}>
                <div>
                  <h3 className="text-[15px] font-semibold text-text-muted uppercase tracking-[0.06em] mb-3 pl-1">
                    {day}
                  </h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {byDay[day].map((e, i) => (
                      <GlowCard key={i} className="p-4">
                        <div className="relative z-10">
                          <p
                            className="text-[11px] font-semibold"
                            style={{ fontFamily: "var(--font-mono)", color: "#E8490F" }}
                          >
                            {e.slot}
                          </p>
                          <p className="text-[15px] font-semibold mt-1.5 leading-[1.3]">
                            {e.course}
                          </p>
                          <div className="mt-2 flex items-center gap-2 text-[11px] text-text-muted">
                            <span>{e.faculty}</span>
                            {e.room && (
                              <>
                                <span>·</span>
                                <span>{e.room}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </GlowCard>
                    ))}
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        ) : (
          /* List view */
          <div className="card-base overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr style={{ background: "#F9F8F6" }}>
                  <th className="text-left text-[11px] uppercase tracking-[0.08em] font-semibold text-text-muted py-3 px-4">
                    Day
                  </th>
                  <th className="text-left text-[11px] uppercase tracking-[0.08em] font-semibold text-text-muted py-3 px-4">
                    Slot
                  </th>
                  <th className="text-left text-[11px] uppercase tracking-[0.08em] font-semibold text-text-muted py-3 px-4">
                    Course
                  </th>
                  <th className="text-left text-[11px] uppercase tracking-[0.08em] font-semibold text-text-muted py-3 px-4">
                    Faculty
                  </th>
                  <th className="text-left text-[11px] uppercase tracking-[0.08em] font-semibold text-text-muted py-3 px-4">
                    Room
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => (
                  <tr
                    key={i}
                    className="border-t border-border hover:bg-orange-tint/20 transition-colors"
                  >
                    <td className="py-2.5 px-4 text-[15px]">{e.day}</td>
                    <td
                      className="py-2.5 px-4 text-[15px]"
                      style={{ fontFamily: "var(--font-mono)", color: "#E8490F" }}
                    >
                      {e.slot}
                    </td>
                    <td className="py-2.5 px-4 text-[15px] font-semibold">{e.course}</td>
                    <td className="py-2.5 px-4 text-[15px] text-text-secondary">{e.faculty}</td>
                    <td className="py-2.5 px-4 text-[15px] text-text-muted">{e.room}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Stats */}
        {entries.length > 0 && (
          <div className="mt-8 grid grid-cols-3 gap-4">
            {[
              { n: entries.length, l: "Total sessions" },
              { n: sections.length, l: "Sections" },
              { n: [...new Set(entries.map((e) => e.course))].length, l: "Courses" },
            ].map((s, i) => (
              <div key={i} className="card-base p-4 text-center">
                <p
                  className="text-[24px] font-bold"
                  style={{ fontFamily: "var(--font-mono)", color: "#E8490F" }}
                >
                  {s.n}
                </p>
                <p className="text-[11px] text-text-muted uppercase tracking-[0.08em] mt-1">
                  {s.l}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
