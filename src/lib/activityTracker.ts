import { supabase } from "./supabase";

export interface ActivityEvent {
  type: "CASE_SOLVED" | "GUESTIMATE_COMPLETED" | "QUESTION_ANSWERED" | "LOGGED_IN";
  userId: string;
  points?: number;
}

export interface ActivityStats {
  today_activities: number;
  current_streak: number;
  longest_streak: number;
  total_points: number;
  activity_level: number; // 0-4
}

// Track user activity
export async function trackActivity(event: ActivityEvent): Promise<void> {
  if (!supabase) return;

  const today = new Date().toISOString().split("T")[0];
  const points = event.points || getPointsForActivity(event.type);

  try {
    // Insert or update activity record
    const { data: existing } = await supabase
      .from("user_activity")
      .select("id, streak")
      .eq("user_id", event.userId)
      .eq("activity_date", today)
      .eq("activity_type", event.type)
      .limit(1);

    if (existing && existing.length > 0) {
      // Activity already exists today
      return;
    }

    // Check yesterday for streak continuation
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    const { data: yesterdayActivity } = await supabase
      .from("user_activity")
      .select("streak")
      .eq("user_id", event.userId)
      .eq("activity_date", yesterdayStr)
      .order("created_at", { ascending: false })
      .limit(1);

    const newStreak =
      yesterdayActivity && yesterdayActivity.length > 0
        ? (yesterdayActivity[0].streak || 0) + 1
        : 1;

    // Create new activity record
    await supabase.from("user_activity").insert({
      user_id: event.userId,
      activity_type: event.type,
      activity_date: today,
      streak: newStreak,
      points,
    });

    // Update or create activity heatmap
    await updateActivityHeatmap(event.userId, today, points);

    // Update user statistics
    await updateUserStatistics(event.userId);
  } catch (err) {
    console.error("Error tracking activity:", err);
  }
}

// Get points for different activity types
function getPointsForActivity(type: string): number {
  const pointsMap: Record<string, number> = {
    LOGGED_IN: 5,
    QUESTION_ANSWERED: 10,
    GUESTIMATE_COMPLETED: 20,
    CASE_SOLVED: 30,
  };
  return pointsMap[type] || 0;
}

// Update activity heatmap for visualization
async function updateActivityHeatmap(userId: string, date: string, points: number): Promise<void> {
  if (!supabase) return;

  try {
    const { data: existing } = await supabase
      .from("activity_heatmap")
      .select("activity_count, points_earned")
      .eq("user_id", userId)
      .eq("activity_date", date)
      .limit(1);

    if (existing && existing.length > 0) {
      const newCount = (existing[0].activity_count || 0) + 1;
      const newPoints = (existing[0].points_earned || 0) + points;

      await supabase
        .from("activity_heatmap")
        .update({
          activity_count: newCount,
          points_earned: newPoints,
          contribution_level: Math.min(Math.floor(newPoints / 50) + 1, 4) as 0 | 1 | 2 | 3 | 4,
        })
        .eq("user_id", userId)
        .eq("activity_date", date);
    } else {
      await supabase.from("activity_heatmap").insert({
        user_id: userId,
        activity_date: date,
        activity_count: 1,
        points_earned: points,
        contribution_level: Math.min(Math.floor(points / 50) + 1, 4) as 0 | 1 | 2 | 3 | 4,
      });
    }
  } catch (err) {
    console.error("Error updating activity heatmap:", err);
  }
}

// Get activity stats for a user
export async function getActivityStats(userId: string): Promise<ActivityStats> {
  if (!supabase) {
    return {
      today_activities: 0,
      current_streak: 0,
      longest_streak: 0,
      total_points: 0,
      activity_level: 0,
    };
  }

  try {
    const today = new Date().toISOString().split("T")[0];

    // Get today's activities
    const { data: todayData } = await supabase
      .from("user_activity")
      .select("id")
      .eq("user_id", userId)
      .eq("activity_date", today);

    // Get current streak
    const { data: streakData } = await supabase
      .from("user_activity")
      .select("streak")
      .eq("user_id", userId)
      .eq("activity_date", today)
      .order("streak", { ascending: false })
      .limit(1);

    // Get longest streak
    const { data: longestData } = await supabase
      .from("user_activity")
      .select("streak")
      .eq("user_id", userId)
      .order("streak", { ascending: false })
      .limit(1);

    // Get total points
    const { data: pointsData } = await supabase.from("user_activity").select("points").eq("user_id", userId);

    const totalPoints = pointsData?.reduce((sum, item) => sum + (item.points || 0), 0) || 0;

    // Get today's heatmap
    const { data: heatmapData } = await supabase
      .from("activity_heatmap")
      .select("contribution_level")
      .eq("user_id", userId)
      .eq("activity_date", today)
      .limit(1);

    return {
      today_activities: todayData?.length || 0,
      current_streak: streakData?.[0]?.streak || 0,
      longest_streak: longestData?.[0]?.streak || 0,
      total_points: totalPoints,
      activity_level: heatmapData?.[0]?.contribution_level || 0,
    };
  } catch (err) {
    console.error("Error getting activity stats:", err);
    return {
      today_activities: 0,
      current_streak: 0,
      longest_streak: 0,
      total_points: 0,
      activity_level: 0,
    };
  }
}

// Get activity heatmap data for the last 365 days
export async function getActivityHeatmapData(userId: string): Promise<Record<string, number>> {
  if (!supabase) return {};

  try {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const { data } = await supabase
      .from("activity_heatmap")
      .select("activity_date, contribution_level")
      .eq("user_id", userId)
      .gte("activity_date", oneYearAgo.toISOString().split("T")[0])
      .order("activity_date", { ascending: true });

    const result: Record<string, number> = {};
    data?.forEach((item: any) => {
      result[item.activity_date] = item.contribution_level || 0;
    });

    return result;
  } catch (err) {
    console.error("Error getting heatmap data:", err);
    return {};
  }
}

// Update user statistics based on submissions
async function updateUserStatistics(userId: string): Promise<void> {
  if (!supabase) return;

  try {
    // Get counts
    const { data: caseData } = await supabase
      .from("case_submissions")
      .select("score")
      .eq("user_id", userId);

    const { data: guessData } = await supabase
      .from("guestimate_submissions")
      .select("score")
      .eq("user_id", userId);

    const { data: activityData } = await supabase
      .from("user_activity")
      .select("streak, points")
      .eq("user_id", userId)
      .order("streak", { ascending: false })
      .limit(1);

    const cases_solved = caseData?.length || 0;
    const cases_score = caseData?.reduce((sum, item) => sum + (item.score || 0), 0) || 0;
    const guesstimates_completed = guessData?.length || 0;
    const guesstimates_score = guessData?.reduce((sum, item) => sum + (item.score || 0), 0) || 0;
    const current_streak = activityData?.[0]?.streak || 0;

    // Get or create stats
    const { data: existing } = await supabase
      .from("user_statistics")
      .select("id")
      .eq("user_id", userId)
      .limit(1);

    if (existing && existing.length > 0) {
      await supabase
        .from("user_statistics")
        .update({
          cases_solved,
          cases_score,
          guesstimates_completed,
          guesstimates_score,
          total_score: cases_score + guesstimates_score,
          current_streak,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    } else {
      await supabase.from("user_statistics").insert({
        user_id: userId,
        cases_solved,
        cases_score,
        guesstimates_completed,
        guesstimates_score,
        total_score: cases_score + guesstimates_score,
        current_streak,
        longest_streak: current_streak,
        last_activity_date: new Date().toISOString().split("T")[0],
      });
    }
  } catch (err) {
    console.error("Error updating user statistics:", err);
  }
}
