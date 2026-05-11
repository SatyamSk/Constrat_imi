// Verify full Supabase setup
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://iulifmoxnwwzpxkbgrzr.supabase.co";
const SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1bGlmbW94bnd3enB4a2JncnpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODI5OTU5NSwiZXhwIjoyMDkzODc1NTk1fQ.U8I2iCOXDDmVzDPUkHzwFjFjPnBMsmCCuOX1NEpuiPw";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1bGlmbW94bnd3enB4a2JncnpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyOTk1OTUsImV4cCI6MjA5Mzg3NTU5NX0.OlxEqRhZJv1WMSxTDbeXj1ypLjfp694VkwEIWXMwqCw";

const service = createClient(SUPABASE_URL, SERVICE_KEY);
const anon = createClient(SUPABASE_URL, ANON_KEY);

console.log("🔍 Constrat Platform — Full Verification\n");

// 1. Check all tables
const tables = [
  "profiles",
  "news",
  "timetable",
  "case_decks",
  "case_submissions",
  "guestimate_submissions",
  "user_activity",
  "user_statistics",
  "case_rankings",
  "activity_heatmap",
  "events",
  "deadlines",
  "competitions",
  "practice_questions",
  "leaderboard_points",
  "alumni",
  "timetable_alerts",
];

console.log("── Tables ──");
for (const t of tables) {
  const { count, error } = await service.from(t).select("*", { count: "exact", head: true });
  console.log(
    `  ${error ? "❌" : "✅"} ${t.padEnd(25)} ${error ? error.message : `${count} rows`}`,
  );
}

// 2. Check storage buckets
console.log("\n── Storage Buckets ──");
const { data: buckets, error: buckErr } = await service.storage.listBuckets();
if (buckErr) {
  console.log(`  ❌ Error listing buckets: ${buckErr.message}`);
} else {
  for (const b of buckets || []) {
    console.log(`  ✅ ${b.name.padEnd(20)} public: ${b.public}`);
  }
  if (!buckets?.find((b) => b.name === "avatars")) {
    console.log("  ⚠️  avatars bucket NOT found");
  }
  if (!buckets?.find((b) => b.name === "case-files")) {
    console.log("  ⚠️  case-files bucket NOT found");
  }
}

// 3. Test storage upload (case-files)
console.log("\n── Storage Upload Test ──");
const testBlob = new Blob(["verify-test"], { type: "text/plain" });
const { error: upErr } = await service.storage
  .from("case-files")
  .upload("_verify_test.txt", testBlob, { upsert: true });
if (upErr) {
  console.log(`  ❌ case-files upload: ${upErr.message}`);
} else {
  console.log("  ✅ case-files upload works");
  await service.storage.from("case-files").remove(["_verify_test.txt"]);
}

// 4. Test avatars bucket upload
const { error: avErr } = await service.storage
  .from("avatars")
  .upload("_verify_test.txt", testBlob, { upsert: true });
if (avErr) {
  console.log(`  ❌ avatars upload: ${avErr.message}`);
} else {
  console.log("  ✅ avatars upload works");
  await service.storage.from("avatars").remove(["_verify_test.txt"]);
}

// 5. Check admin profile
console.log("\n── Admin Profile ──");
const { data: profiles } = await service.from("profiles").select("email, role").eq("role", "admin");
if (profiles && profiles.length > 0) {
  for (const p of profiles) {
    console.log(`  ✅ ${p.email} — role: ${p.role}`);
  }
} else {
  console.log("  ⚠️  No admin profiles found");
}

// 6. Check auth users
console.log("\n── Auth Users ──");
const {
  data: { users },
} = await service.auth.admin.listUsers();
console.log(`  Total users: ${users?.length || 0}`);
for (const u of (users || []).slice(0, 5)) {
  console.log(`  • ${u.email} (${u.email_confirmed_at ? "confirmed" : "unconfirmed"})`);
}

console.log("\n✨ Verification complete!\n");
