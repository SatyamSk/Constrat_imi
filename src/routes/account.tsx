import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { getMyGlobalRank } from "@/lib/caseAnalysis";
import { PageShell, PageHeader } from "@/components/PageShell";
import { GlowCard } from "@/components/GlowCard";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/account")({ component: Account });

interface Profile {
  id: string;
  full_name: string;
  email: string;
  batch: string;
  section: string;
  specialization: string;
  phone: string;
  avatar_url: string;
}

interface UserStats {
  cases_solved: number;
  guesstimates_completed: number;
  total_score: number;
  cases_score: number;
  guesstimates_score: number;
  current_streak: number;
}

function Account() {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<UserStats>({
    cases_solved: 0,
    guesstimates_completed: 0,
    total_score: 0,
    cases_score: 0,
    guesstimates_score: 0,
    current_streak: 0,
  });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Profile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [globalRank, setGlobalRank] = useState<{
    rank: number;
    total_score: number;
    cases_solved: number;
    guesstimates_completed: number;
    current_streak: number;
  } | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    loadProfile();
    loadStats();
    getMyGlobalRank(user.id).then((r) => setGlobalRank(r as any));
  }, [user, authLoading]);

  const loadProfile = async () => {
    if (!isSupabaseConfigured || !supabase || !user) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      if (data) {
        // Self-heal: if profile name is empty but the user's auth metadata has
        // one (e.g. Google sign-in supplies `name` / `full_name`), copy it in.
        const metaName =
          (user.user_metadata?.full_name as string) ||
          (user.user_metadata?.name as string) ||
          "";
        if (!data.full_name?.trim() && metaName) {
          const { data: updated } = await supabase
            .from("profiles")
            .update({ full_name: metaName })
            .eq("id", user.id)
            .select()
            .maybeSingle();
          if (updated) {
            setProfile(updated as Profile);
            setFormData(updated as Profile);
            return;
          }
        }
        setProfile(data as Profile);
        setFormData(data as Profile);
      }
    } catch (err) {
      console.error("Error loading profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!isSupabaseConfigured || !supabase || !user) return;
    try {
      // Fetch user stats - you can expand this based on your actual tables
      const { data: caseData } = await supabase
        .from("case_submissions")
        .select("*")
        .eq("user_id", user.id);

      const { data: guessData } = await supabase
        .from("guestimate_submissions")
        .select("*")
        .eq("user_id", user.id);

      const { data: activityData } = await supabase
        .from("user_activity")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      const cases_solved = caseData?.length || 0;
      const guesstimates_completed = guessData?.length || 0;
      let cases_score = 0;
      let guesstimates_score = 0;

      if (caseData) {
        cases_score = caseData.reduce((acc, item: any) => acc + (item.score || 0), 0);
      }
      if (guessData) {
        guesstimates_score = guessData.reduce((acc, item: any) => acc + (item.score || 0), 0);
      }

      const current_streak = activityData?.[0]?.streak || 0;

      setStats({
        cases_solved,
        guesstimates_completed,
        total_score: cases_score + guesstimates_score,
        cases_score,
        guesstimates_score,
        current_streak,
      });
    } catch (err) {
      console.error("Error loading stats:", err);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !isSupabaseConfigured || !supabase) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);

      await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", user.id);

      if (profile) {
        setProfile({ ...profile, avatar_url: data.publicUrl });
        setFormData({ ...profile, avatar_url: data.publicUrl });
      }
    } catch (err) {
      console.error("Error uploading avatar:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!formData || !isSupabaseConfigured || !supabase) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          batch: formData.batch,
          section: formData.section,
          specialization: formData.specialization,
          phone: formData.phone,
        })
        .eq("id", user!.id);

      if (error) throw error;
      setProfile(formData);
      setEditing(false);
    } catch (err) {
      console.error("Error saving profile:", err);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  if (loading) {
    return (
      <PageShell>
        <PageHeader eyebrow="Your Account" title="Profile" />
        <div className="mx-auto max-w-[1180px] px-5 md:px-6 pb-20">
          <div className="card-base p-12 text-center">
            <div className="w-8 h-8 rounded-full border-2 border-orange border-t-transparent animate-spin mx-auto"></div>
            <p className="mt-4 text-[14px] text-text-muted">Loading your profile...</p>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Your Account"
        title="Profile Settings"
        subtitle="Manage your account information and track your progress."
      />
      <div className="mx-auto max-w-[1180px] px-5 md:px-6 pb-20">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="md:col-span-2">
            <GlowCard className="p-8">
              <div className="relative z-10">
                {/* Avatar */}
                <div className="flex items-end gap-4 mb-6 pb-6 border-b border-border">
                  <div className="relative">
                    <img
                      src={
                        profile?.avatar_url ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || "User")}&background=E8490F&color=fff`
                      }
                      alt="Avatar"
                      className="w-20 h-20 rounded-full object-cover border-2 border-orange"
                    />
                    {!editing && (
                      <label className="absolute bottom-0 right-0 p-1.5 rounded-full bg-orange text-white cursor-pointer hover:bg-orange/80 transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          disabled={uploading}
                          className="hidden"
                        />
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                      </label>
                    )}
                  </div>
                  <div>
                    <h2 className="text-[24px] font-semibold">
                      {profile?.full_name?.trim() ||
                        (profile?.email
                          ? profile.email.split("@")[0]
                          : user?.email?.split("@")[0]) ||
                        "Member"}
                    </h2>
                    <p className="text-[13px] text-text-muted">{profile?.email}</p>
                  </div>
                </div>

                {/* Form */}
                {editing && formData ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-[12px] font-semibold text-text-muted mb-1 block">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className="input-base w-full"
                      />
                    </div>
                    <div>
                      <label className="text-[12px] font-semibold text-text-muted mb-1 block">
                        Batch
                      </label>
                      <input
                        type="text"
                        value={formData.batch}
                        onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                        className="input-base w-full"
                        placeholder="e.g., 2024-2025"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[12px] font-semibold text-text-muted mb-1 block">
                          Section
                        </label>
                        <input
                          type="text"
                          value={formData.section}
                          onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                          className="input-base w-full"
                          placeholder="e.g., A"
                        />
                      </div>
                      <div>
                        <label className="text-[12px] font-semibold text-text-muted mb-1 block">
                          Specialization
                        </label>
                        <input
                          type="text"
                          value={formData.specialization}
                          onChange={(e) =>
                            setFormData({ ...formData, specialization: e.target.value })
                          }
                          className="input-base w-full"
                          placeholder="e.g., Finance"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[12px] font-semibold text-text-muted mb-1 block">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="input-base w-full"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button onClick={handleSaveProfile} className="btn-primary flex-1">
                        Save Changes
                      </button>
                      <button
                        onClick={() => {
                          setEditing(false);
                          setFormData(profile);
                        }}
                        className="btn-secondary flex-1"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.08em] mb-1">
                          Batch
                        </p>
                        <p className="text-[14px]">{profile?.batch || "—"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.08em] mb-1">
                          Section
                        </p>
                        <p className="text-[14px]">{profile?.section || "—"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.08em] mb-1">
                          Specialization
                        </p>
                        <p className="text-[14px]">{profile?.specialization || "—"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.08em] mb-1">
                          Phone
                        </p>
                        <p className="text-[14px]">{profile?.phone || "—"}</p>
                      </div>
                    </div>
                    <button onClick={() => setEditing(true)} className="btn-primary w-full">
                      Edit Profile
                    </button>
                  </div>
                )}
              </div>
            </GlowCard>
          </div>

          {/* Stats Card */}
          <div className="space-y-4">
            {globalRank && (
              <GlowCard className="p-6">
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[14px] font-semibold">Your Global Rank</h3>
                    <Link to="/leaderboard" className="text-[11px] text-orange hover:underline">
                      View all →
                    </Link>
                  </div>
                  <div className="flex items-end gap-2">
                    <p
                      className="font-serif text-[48px] leading-none"
                      style={{ color: "#E8490F" }}
                    >
                      #{globalRank.rank}
                    </p>
                    <p className="text-[13px] text-text-muted pb-2">
                      of all members
                    </p>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[16px] font-bold">{globalRank.total_score}</p>
                      <p className="text-[10px] text-text-muted uppercase tracking-[0.06em]">
                        Points
                      </p>
                    </div>
                    <div>
                      <p className="text-[16px] font-bold">{globalRank.cases_solved}</p>
                      <p className="text-[10px] text-text-muted uppercase tracking-[0.06em]">
                        Cases
                      </p>
                    </div>
                    <div>
                      <p className="text-[16px] font-bold">
                        {globalRank.guesstimates_completed}
                      </p>
                      <p className="text-[10px] text-text-muted uppercase tracking-[0.06em]">
                        Guess.
                      </p>
                    </div>
                  </div>
                </div>
              </GlowCard>
            )}

            <GlowCard className="p-6">
              <div className="relative z-10">
                <h3 className="text-[14px] font-semibold mb-4">Your Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-[12px] text-text-muted">Cases Solved</p>
                    <p className="text-[18px] font-bold" style={{ color: "#E8490F" }}>
                      {stats.cases_solved}
                    </p>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex justify-between items-center">
                    <p className="text-[12px] text-text-muted">Guesstimates</p>
                    <p className="text-[18px] font-bold" style={{ color: "#E8490F" }}>
                      {stats.guesstimates_completed}
                    </p>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex justify-between items-center">
                    <p className="text-[12px] text-text-muted">Current Streak</p>
                    <p className="text-[18px] font-bold" style={{ color: "#E8490F" }}>
                      {stats.current_streak} days
                    </p>
                  </div>
                </div>
              </div>
            </GlowCard>

            <GlowCard className="p-6">
              <div className="relative z-10">
                <h3 className="text-[14px] font-semibold mb-4">Overall Score</h3>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between mb-1">
                      <p className="text-[12px] text-text-muted">Cases</p>
                      <p className="text-[14px] font-semibold">{stats.cases_score}</p>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min((stats.cases_score / 1000) * 100, 100)}%`,
                          background: "linear-gradient(90deg, #E8490F, #FF6B35)",
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <p className="text-[12px] text-text-muted">Guesstimates</p>
                      <p className="text-[14px] font-semibold">{stats.guesstimates_score}</p>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min((stats.guesstimates_score / 1000) * 100, 100)}%`,
                          background: "linear-gradient(90deg, #E8490F, #FF6B35)",
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex justify-between">
                    <p className="text-[12px] font-semibold">Total</p>
                    <p className="text-[18px] font-bold" style={{ color: "#E8490F" }}>
                      {stats.total_score}
                    </p>
                  </div>
                </div>
              </div>
            </GlowCard>

            <button onClick={handleLogout} className="btn-secondary w-full">
              Logout
            </button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
