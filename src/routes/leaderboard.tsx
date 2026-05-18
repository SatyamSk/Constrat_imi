import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { PageHeader } from "@/components/PageHeader";
import { GlowCard } from "@/components/GlowCard";
import { AnimatedSection } from "@/components/AnimatedSection";
import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/leaderboard")({ component: Leaderboard });

interface LeaderboardUser {
  rank: number;
  user_id: string;
  name: string;
  cases: number;
  score: number;
  avatar_url: string;
}

const RANK_COLORS = ["#E8490F", "#FF8C42", "#F59E0B"];

function Leaderboard() {
  const { user } = useAuth();
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState<LeaderboardUser | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        // Aggregate scores from case_submissions (the source of truth)
        const { data, error } = await supabase
          .from("case_submissions")
          .select("user_id, score, profiles!inner(full_name, email, avatar_url)")
          .order("submitted_at", { ascending: false });

        if (error) {
          console.error("[leaderboard] fetch error:", error);
          setLoading(false);
          return;
        }

        // Aggregate by user
        const userMap = new Map<string, {
          user_id: string;
          name: string;
          avatar_url: string;
          totalScore: number;
          caseCount: number;
        }>();

        for (const row of data || []) {
          const uid = row.user_id;
          const profile = row.profiles as any;
          const existing = userMap.get(uid);
          if (existing) {
            existing.totalScore += row.score || 0;
            existing.caseCount += 1;
          } else {
            userMap.set(uid, {
              user_id: uid,
              name: profile?.full_name || profile?.email || "Anonymous",
              avatar_url: profile?.avatar_url || "",
              totalScore: row.score || 0,
              caseCount: 1,
            });
          }
        }

        // Sort by totalScore descending
        const sorted = Array.from(userMap.values())
          .sort((a, b) => b.totalScore - a.totalScore)
          .map((u, i) => ({
            rank: i + 1,
            user_id: u.user_id,
            name: u.name,
            cases: u.caseCount,
            score: u.totalScore,
            avatar_url: u.avatar_url,
          }));

        setUsers(sorted);

        // Find current user's rank
        if (user) {
          const mine = sorted.find((u) => u.user_id === user.id);
          setMyRank(mine || null);
        }
      } catch (err) {
        console.error("[leaderboard] error:", err);
      }
      setLoading(false);
    })();
  }, [user]);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Leaderboard"
        title="See where you stand."
        subtitle="Rankings based on case submission scores. Updated in real-time from actual submissions."
      />
      <div className="mx-auto max-w-[1180px] px-5 md:px-6 -mt-4 pb-20">

        {loading && (
          <div className="card-base p-12 text-center mb-8">
            <div className="w-8 h-8 mx-auto rounded-full border-2 border-orange border-t-transparent animate-spin" />
            <p className="mt-4 text-[15px] text-text-muted">Loading leaderboard…</p>
          </div>
        )}

        {!loading && users.length === 0 && (
          <div className="text-center py-16">
            <p className="text-[48px] mb-4">🏆</p>
            <p className="text-[17px] font-semibold text-text-primary mb-2">
              No rankings yet
            </p>
            <p className="text-[14px] text-text-muted max-w-md mx-auto">
              Submit your first case solution to appear on the leaderboard.{" "}
              <Link to="/practice" className="text-orange hover:underline">
                Start practicing →
              </Link>
            </p>
          </div>
        )}

        {!loading && users.length > 0 && (
          <>
            {/* Top 3 podium cards */}
            <div className="grid md:grid-cols-3 gap-5 mb-10">
              {users.slice(0, 3).map((u, i) => (
                <AnimatedSection key={u.user_id} delay={i * 100}>
                  <GlowCard
                    className="p-6 text-center"
                    style={i === 0 ? { borderColor: "rgba(232,73,15,0.4)" } : {}}
                  >
                    <div className="relative z-10">
                      {u.avatar_url ? (
                        <img
                          src={u.avatar_url}
                          alt=""
                          className="w-14 h-14 rounded-full mx-auto object-cover"
                          style={{ boxShadow: `0 4px 20px ${RANK_COLORS[i]}40` }}
                        />
                      ) : (
                        <div
                          className="w-14 h-14 rounded-full mx-auto flex items-center justify-center text-white text-[20px] font-bold"
                          style={{
                            background: RANK_COLORS[i],
                            fontFamily: "var(--font-mono)",
                            boxShadow: `0 4px 20px ${RANK_COLORS[i]}40`,
                          }}
                        >
                          {u.rank}
                        </div>
                      )}
                      <h3 className="mt-3 text-[18px] font-semibold">{u.name}</h3>
                      <p className="text-[12px] text-text-muted">Rank #{u.rank}</p>
                      <p
                        className="mt-3 text-[32px] font-bold leading-none"
                        style={{ fontFamily: "var(--font-mono)", color: RANK_COLORS[i] }}
                      >
                        {u.score}
                      </p>
                      <p className="text-[11px] text-text-muted mt-1">total score</p>
                      <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-2 text-center">
                        <div>
                          <p
                            className="text-[17px] font-bold"
                            style={{ fontFamily: "var(--font-mono)" }}
                          >
                            {u.cases}
                          </p>
                          <p className="text-[9px] text-text-muted uppercase tracking-[0.08em]">
                            Cases
                          </p>
                        </div>
                        <div>
                          <p
                            className="text-[17px] font-bold"
                            style={{ fontFamily: "var(--font-mono)", color: "#E8490F" }}
                          >
                            {Math.round(u.score / Math.max(u.cases, 1))}
                          </p>
                          <p className="text-[9px] text-text-muted uppercase tracking-[0.08em]">
                            Avg Score
                          </p>
                        </div>
                      </div>
                    </div>
                  </GlowCard>
                </AnimatedSection>
              ))}
            </div>

            {/* Scoring info */}
            <div
              className="card-base p-4 mb-6 flex items-center gap-3"
              style={{ background: "#FFF7F3" }}
            >
              <span className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.08em] shrink-0">
                Score =
              </span>
              <p className="text-[12px] text-text-secondary" style={{ fontFamily: "var(--font-mono)" }}>
                Sum of all case submission AI scores. Each case is scored 0-100 based on framework, clarity, approach, and execution.
              </p>
            </div>

            {/* Remaining users */}
            {users.length > 3 && (
              <div className="space-y-3">
                {users.slice(3).map((u, i) => (
                  <AnimatedSection key={u.user_id} delay={i * 40}>
                    <div className="card-base p-4 flex items-center gap-4 hover:border-orange/30">
                      <span
                        className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center text-[15px] font-bold text-text-muted shrink-0"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {u.rank}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-semibold">{u.name}</p>
                      </div>
                      <div
                        className="hidden sm:flex items-center gap-6 text-[15px]"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        <div className="text-center">
                          <p className="font-bold">{u.cases}</p>
                          <p className="text-[9px] text-text-muted">Cases</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold">{Math.round(u.score / Math.max(u.cases, 1))}</p>
                          <p className="text-[9px] text-text-muted">Avg</p>
                        </div>
                      </div>
                      <p
                        className="text-[18px] font-bold shrink-0"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {u.score}
                      </p>
                    </div>
                  </AnimatedSection>
                ))}
              </div>
            )}
          </>
        )}

        {/* Your rank */}
        {!loading && (
          <div
            className="mt-6 card-base p-4 flex items-center gap-4"
            style={{ background: "#FFF7F3", borderColor: "#E8490F", borderWidth: "1.5px" }}
          >
            <span
              className="w-9 h-9 rounded-full bg-orange flex items-center justify-center text-white text-[15px] font-bold shrink-0"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {myRank ? myRank.rank : "?"}
            </span>
            <div className="flex-1">
              <p className="text-[15px] font-semibold">
                {myRank ? myRank.name : "Your Rank"}
              </p>
              <p className="text-[12px] text-text-muted">
                {myRank
                  ? `Score: ${myRank.score} · ${myRank.cases} cases solved`
                  : user
                    ? "Submit a case to appear on the leaderboard"
                    : "Login to see where you stand"}
              </p>
            </div>
            {!user && (
              <Link to="/join" className="btn-primary h-9 px-5 text-[12px]">
                Join Now
              </Link>
            )}
            {user && !myRank && (
              <Link to="/practice" className="btn-primary h-9 px-5 text-[12px]">
                Start Practicing
              </Link>
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}
