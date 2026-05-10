import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { PageShell, PageHeader } from "@/components/PageShell";
import { AnimatedSection } from "@/components/AnimatedSection";
import { GlowCard } from "@/components/GlowCard";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export const Route = createFileRoute("/admin")({
  component: Admin,
});

/* ─── Smart file name cleaner ─── */
function cleanFileName(raw: string): { name: string; category: string; fileType: string } {
  let name = raw.replace(/\.[^/.]+$/, ""); // strip extension
  const ext = raw.split(".").pop()?.toUpperCase() || "OTHER";
  const fileType = ext === "PPT" ? "PPTX" : ext === "XLS" ? "XLSX" : ext === "DOC" ? "DOCX" : ext;

  // Remove common junk patterns
  name = name
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\(\d+\)/g, "") // remove (1), (2) etc
    .replace(/\bcopy\b/gi, "")
    .replace(/\bfinal\s*v?\d*/gi, "")
    .replace(/\bv\d+(\.\d+)?/gi, "")
    .replace(/\b\d{8,}\b/g, "") // remove long number strings
    .replace(/^\d+[\s.-]+/, "") // leading numbers
    .trim();

  // Title case
  name = name.replace(/\b\w/g, (c) => c.toUpperCase());

  // Guess category from keywords
  let category = "General";
  const lower = name.toLowerCase();
  if (/mckinsey/i.test(lower)) category = "McKinsey";
  else if (/bcg/i.test(lower)) category = "BCG";
  else if (/bain/i.test(lower)) category = "Bain";
  else if (/deloitte/i.test(lower)) category = "Deloitte";
  else if (/kpmg/i.test(lower)) category = "KPMG";
  else if (/accenture/i.test(lower)) category = "Accenture";
  else if (/case\s*(study|comp|deck)/i.test(lower)) category = "Competition Decks";
  else if (/framework|mece|issue\s*tree/i.test(lower)) category = "Consulting Frameworks";
  else if (/primer|industry/i.test(lower)) category = "Industry Primers";
  else if (/excel|model|dcf|financial/i.test(lower)) category = "Excel Models";
  else if (/ppt|template|slide/i.test(lower)) category = "PPT Templates";
  else if (/interview|hr|behavioral/i.test(lower)) category = "Interview Prep";
  else if (/gd|group\s*discussion/i.test(lower)) category = "GD Topics";
  else if (/iim|iit|nit|xlri|fms/i.test(lower)) category = "Student Decks";

  return { name, category, fileType };
}

type QueueItem = {
  file: File;
  cleanName: string;
  category: string;
  fileType: string;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
};

function Admin() {
  const [tab, setTab] = useState<"cases" | "deadlines" | "competitions" | "news" | "timetable">(
    "cases",
  );

  return (
    <PageShell>
      <PageHeader
        eyebrow="Admin Panel"
        title="Manage everything."
        subtitle="Upload case decks, add deadlines, manage competitions, and control content."
      >
        <div className="flex gap-2 flex-wrap">
          {(["cases", "deadlines", "competitions", "news", "timetable"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-4 h-9 rounded-lg text-[13px] font-medium border capitalize transition-colors"
              style={
                tab === t
                  ? { background: "#E8490F", color: "#fff", borderColor: "#E8490F" }
                  : { background: "#fff", color: "#5C5C5A", borderColor: "#E8E4DE" }
              }
            >
              {t}
            </button>
          ))}
        </div>
      </PageHeader>

      <section className="bg-background">
        <div className="mx-auto max-w-[1180px] px-5 md:px-6 py-10 md:py-14">
          {tab === "cases" && <CaseDeckUploader />}
          {tab === "deadlines" && <DeadlineManager />}
          {tab === "competitions" && <CompetitionManager />}
          {tab === "news" && <NewsManager />}
          {tab === "timetable" && <TimetableManager />}
        </div>
      </section>
    </PageShell>
  );
}

/* ─── CASE DECK UPLOADER ─── */
function CaseDeckUploader() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    if (!files) return;
    const validExts = [
      "pdf",
      "pptx",
      "ppt",
      "xlsx",
      "xls",
      "docx",
      "doc",
      "csv",
      "txt",
      "zip",
      "png",
      "jpg",
      "jpeg",
    ];
    const items: QueueItem[] = Array.from(files)
      .filter((f) => {
        const ext = f.name.split(".").pop()?.toLowerCase() || "";
        return validExts.includes(ext) || f.size > 0;
      })
      .map((f) => {
        const { name, category, fileType } = cleanFileName(f.name);
        return { file: f, cleanName: name, category, fileType, status: "pending" };
      });
    setQueue((prev) => [...prev, ...items]);
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.currentTarget.classList.remove("border-orange");
    const items = e.dataTransfer.items;
    if (items) {
      const files: File[] = [];
      const entries = Array.from(items)
        .map((i) => i.webkitGetAsEntry?.())
        .filter(Boolean);
      async function readDir(entry: FileSystemDirectoryEntry): Promise<File[]> {
        return new Promise((resolve) => {
          const reader = entry.createReader();
          reader.readEntries(async (results) => {
            const all: File[] = [];
            for (const r of results) {
              if (r.isFile) {
                const f = await new Promise<File>((res) => (r as FileSystemFileEntry).file(res));
                all.push(f);
              } else if (r.isDirectory) {
                const sub = await readDir(r as FileSystemDirectoryEntry);
                all.push(...sub);
              }
            }
            resolve(all);
          });
        });
      }
      for (const entry of entries) {
        if (entry!.isFile) {
          const f = await new Promise<File>((res) => (entry as FileSystemFileEntry).file(res));
          files.push(f);
        } else if (entry!.isDirectory) {
          const sub = await readDir(entry as FileSystemDirectoryEntry);
          files.push(...sub);
        }
      }
      const dt = new DataTransfer();
      files.forEach((f) => dt.items.add(f));
      handleFiles(dt.files);
    } else {
      handleFiles(e.dataTransfer.files);
    }
  }

  function updateItem(idx: number, patch: Partial<QueueItem>) {
    setQueue((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  async function uploadAll() {
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (item.status !== "pending") continue;
      updateItem(i, { status: "uploading" });

      try {
        if (!isSupabaseConfigured || !supabase) {
          // Demo mode: simulate upload
          await new Promise((r) => setTimeout(r, 800));
          updateItem(i, { status: "done" });
          continue;
        }

        // Upload file to Supabase Storage
        const path = `case-decks/${Date.now()}-${item.file.name}`;
        const { error: uploadErr } = await supabase.storage
          .from("case-files")
          .upload(path, item.file, { upsert: true });

        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage.from("case-files").getPublicUrl(path);

        // Insert into case_decks table
        const { error: dbErr } = await supabase.from("case_decks").insert({
          name: item.cleanName,
          category: item.category,
          file_type: item.fileType,
          file_url: urlData.publicUrl,
          source: "Admin Upload",
          description: "",
          added_date: new Date().toISOString().split("T")[0],
        });

        if (dbErr) throw dbErr;
        updateItem(i, { status: "done" });
      } catch (err: unknown) {
        updateItem(i, {
          status: "error",
          error: err instanceof Error ? err.message : "Upload failed",
        });
      }
    }
  }

  const pendingCount = queue.filter((q) => q.status === "pending").length;

  return (
    <div>
      <h2 className="font-serif text-[28px] font-semibold">Case Deck Upload</h2>
      <p className="mt-2 text-[14px] text-text-secondary">
        Drop files or folders. Select multiple folders one by one — they all add to the queue. Drag
        multiple folders at once too.
      </p>

      {/* Drop zone */}
      <div
        className="mt-6 border-2 border-dashed border-border rounded-2xl p-10 text-center cursor-pointer hover:border-orange transition-colors"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.classList.add("border-orange");
        }}
        onDragLeave={(e) => e.currentTarget.classList.remove("border-orange")}
        onDrop={handleDrop}
      >
        <p className="text-[16px] font-semibold text-text-primary">Drop files or folders here</p>
        <p className="mt-1 text-[13px] text-text-muted">
          Any format — PDF, PPT, XLSX, DOCX, images, ZIP — or entire folders. Keep adding more!
        </p>
        {queue.length > 0 && (
          <p className="mt-2 text-[13px] text-orange font-semibold">
            {queue.length} file(s) in queue
          </p>
        )}
        <div className="mt-4 flex justify-center gap-3 flex-wrap">
          <button
            onClick={(e) => {
              e.stopPropagation();
              fileRef.current?.click();
            }}
            className="btn-secondary text-[13px] h-9 px-4"
          >
            + Select Files
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              folderRef.current?.click();
            }}
            className="btn-secondary text-[13px] h-9 px-4"
          >
            + Select Folder
          </button>
          {queue.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setQueue([]);
              }}
              className="text-[12px] text-text-muted hover:text-urgent transition-colors px-3"
            >
              Clear All
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={folderRef}
          type="file"
          multiple
          {...({
            webkitdirectory: "",
            directory: "",
          } as React.InputHTMLAttributes<HTMLInputElement>)}
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* Queue */}
      {queue.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[16px] font-semibold">{queue.length} file(s) in queue</h3>
            {pendingCount > 0 && (
              <button onClick={uploadAll} className="btn-primary h-10 px-5 text-[13px]">
                Upload {pendingCount} file(s)
              </button>
            )}
          </div>
          <div className="space-y-3">
            {queue.map((item, idx) => (
              <GlowCard key={idx} className="p-4">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <input
                      value={item.cleanName}
                      onChange={(e) => updateItem(idx, { cleanName: e.target.value })}
                      className="input-base w-full text-[14px] font-semibold"
                      disabled={item.status !== "pending"}
                    />
                    <div className="mt-2 flex gap-2 flex-wrap">
                      <select
                        value={item.category}
                        onChange={(e) => updateItem(idx, { category: e.target.value })}
                        className="input-base text-[12px] h-7 px-2"
                        disabled={item.status !== "pending"}
                      >
                        {[
                          "General",
                          "Consulting Frameworks",
                          "Competition Decks",
                          "Industry Primers",
                          "McKinsey",
                          "BCG",
                          "Bain",
                          "Deloitte",
                          "KPMG",
                          "Accenture",
                          "Student Decks",
                          "Excel Models",
                          "PPT Templates",
                          "Interview Prep",
                          "GD Topics",
                        ].map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                      <span
                        className={`pill ${item.fileType === "PDF" ? "pill-red" : item.fileType === "PPTX" ? "pill-orange" : "pill-blue"}`}
                      >
                        {item.fileType}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 text-[13px] font-medium w-20 text-right">
                    {item.status === "pending" && <span className="text-text-muted">Pending</span>}
                    {item.status === "uploading" && (
                      <span className="text-orange">Uploading...</span>
                    )}
                    {item.status === "done" && <span className="text-success">Done</span>}
                    {item.status === "error" && (
                      <span className="text-urgent" title={item.error}>
                        Error
                      </span>
                    )}
                  </div>
                </div>
              </GlowCard>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── DEADLINE MANAGER ─── */
function DeadlineManager() {
  const [form, setForm] = useState({
    title: "",
    description: "",
    deadline: "",
    source: "Placement",
    batch: "All",
    urgency: "medium",
  });
  const [msg, setMsg] = useState("");

  async function addDeadline() {
    if (!form.title || !form.deadline) return;
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from("deadlines").insert({
        title: form.title,
        description: form.description,
        deadline_date: form.deadline,
        source: form.source,
        batch: form.batch,
        urgency: form.urgency,
      });
      setMsg(error ? `Error: ${error.message}` : "Deadline added!");
    } else {
      setMsg("Demo mode: Deadline would be saved to database.");
    }
    setForm({
      title: "",
      description: "",
      deadline: "",
      source: "Placement",
      batch: "All",
      urgency: "medium",
    });
  }

  return (
    <div>
      <h2 className="font-serif text-[28px] font-semibold">Add Deadline</h2>
      <div className="mt-6 card-base p-6 space-y-4 max-w-[600px]">
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Deadline title..."
          className="input-base w-full"
        />
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Description..."
          className="input-base w-full h-20 resize-none"
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            type="date"
            value={form.deadline}
            onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            className="input-base"
          />
          <select
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value })}
            className="input-base"
          >
            <option>Placement</option>
            <option>Constrat</option>
            <option>Academics</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <select
            value={form.batch}
            onChange={(e) => setForm({ ...form, batch: e.target.value })}
            className="input-base"
          >
            <option>All</option>
            <option>2025</option>
            <option>2026</option>
            <option>2027</option>
          </select>
          <select
            value={form.urgency}
            onChange={(e) => setForm({ ...form, urgency: e.target.value })}
            className="input-base"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <button onClick={addDeadline} className="btn-primary w-full">
          Add Deadline
        </button>
        {msg && <p className="text-[13px] text-success">{msg}</p>}
      </div>
    </div>
  );
}

/* ─── COMPETITION MANAGER ─── */
function CompetitionManager() {
  const [form, setForm] = useState({
    name: "",
    org: "Unstop",
    deadline: "",
    prize: "",
    url: "",
    tag: "Live",
  });
  const [msg, setMsg] = useState("");

  async function addComp() {
    if (!form.name) return;
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from("competitions").insert({
        name: form.name,
        organizer: form.org,
        deadline_date: form.deadline,
        prize: form.prize,
        url: form.url,
        tag: form.tag,
      });
      setMsg(error ? `Error: ${error.message}` : "Competition added!");
    } else {
      setMsg("Demo mode: Competition would be saved.");
    }
    setForm({ name: "", org: "Unstop", deadline: "", prize: "", url: "", tag: "Live" });
  }

  return (
    <div>
      <h2 className="font-serif text-[28px] font-semibold">Add Competition</h2>
      <p className="mt-2 text-[14px] text-text-secondary">
        From Unstop, Grad Partners, Kampus Connect, or any platform.
      </p>
      <div className="mt-6 card-base p-6 space-y-4 max-w-[600px]">
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Competition name..."
          className="input-base w-full"
        />
        <div className="grid grid-cols-2 gap-3">
          <select
            value={form.org}
            onChange={(e) => setForm({ ...form, org: e.target.value })}
            className="input-base"
          >
            <option>Unstop</option>
            <option>Grad Partners</option>
            <option>Kampus Connect</option>
            <option>Other</option>
          </select>
          <select
            value={form.tag}
            onChange={(e) => setForm({ ...form, tag: e.target.value })}
            className="input-base"
          >
            <option>Live</option>
            <option>Opening Soon</option>
            <option>Closed</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="date"
            value={form.deadline}
            onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            className="input-base"
            placeholder="Deadline"
          />
          <input
            value={form.prize}
            onChange={(e) => setForm({ ...form, prize: e.target.value })}
            placeholder="Prize (e.g. Rs 3,00,000)"
            className="input-base"
          />
        </div>
        <input
          value={form.url}
          onChange={(e) => setForm({ ...form, url: e.target.value })}
          placeholder="Link to apply..."
          className="input-base w-full"
        />
        <button onClick={addComp} className="btn-primary w-full">
          Add Competition
        </button>
        {msg && <p className="text-[13px] text-success">{msg}</p>}
      </div>
    </div>
  );
}

/* ─── NEWS MANAGER ─── */
function NewsManager() {
  const [form, setForm] = useState({ title: "", source: "", topic: "Macro", summary: "", url: "" });
  const [msg, setMsg] = useState("");

  async function addNews() {
    if (!form.title) return;
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from("news").insert({
        title: form.title,
        source: form.source,
        topic: form.topic,
        ai_summary: form.summary,
        url: form.url,
      });
      setMsg(error ? `Error: ${error.message}` : "News added!");
    } else {
      setMsg("Demo mode: News would be saved.");
    }
    setForm({ title: "", source: "", topic: "Macro", summary: "", url: "" });
  }

  return (
    <div>
      <h2 className="font-serif text-[28px] font-semibold">Add News Article</h2>
      <div className="mt-6 card-base p-6 space-y-4 max-w-[600px]">
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Headline..."
          className="input-base w-full"
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value })}
            placeholder="Source (ET, Reuters...)"
            className="input-base"
          />
          <select
            value={form.topic}
            onChange={(e) => setForm({ ...form, topic: e.target.value })}
            className="input-base"
          >
            <option>Macro</option>
            <option>Markets</option>
            <option>Startup</option>
            <option>FMCG</option>
            <option>Tech</option>
            <option>Banking</option>
            <option>Consulting</option>
          </select>
        </div>
        <textarea
          value={form.summary}
          onChange={(e) => setForm({ ...form, summary: e.target.value })}
          placeholder="AI Summary / Key takeaway..."
          className="input-base w-full h-20 resize-none"
        />
        <input
          value={form.url}
          onChange={(e) => setForm({ ...form, url: e.target.value })}
          placeholder="Article URL..."
          className="input-base w-full"
        />
        <button onClick={addNews} className="btn-primary w-full">
          Add News
        </button>
        {msg && <p className="text-[13px] text-success">{msg}</p>}
      </div>
    </div>
  );
}

/* ─── TIMETABLE MANAGER ─── */
function TimetableManager() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState("");

  async function triggerSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/timetable_sync");
      const data = await res.json();
      setResult(
        data.success
          ? `Synced ${data.entries_synced || 0} entries, ${data.changes_detected || 0} changes`
          : `Error: ${data.error}`,
      );
    } catch {
      setResult("Sync endpoint not available in dev mode. Works on Vercel.");
    }
    setSyncing(false);
  }

  return (
    <div>
      <h2 className="font-serif text-[28px] font-semibold">Timetable Sync</h2>
      <p className="mt-2 text-[14px] text-text-secondary">
        Manually trigger timetable sync from Google Sheet.
      </p>
      <div className="mt-6 card-base p-6 max-w-[600px]">
        <button onClick={triggerSync} disabled={syncing} className="btn-primary w-full">
          {syncing ? "Syncing..." : "Trigger Timetable Sync"}
        </button>
        {result && <p className="mt-3 text-[13px] text-text-secondary">{result}</p>}
      </div>
    </div>
  );
}
