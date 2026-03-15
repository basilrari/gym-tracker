import { createClient } from "@/lib/supabase/server";
import type { LeaderboardRow, LeaderboardPeriod } from "./types";

export async function getLeaderboard(
  period: LeaderboardPeriod
): Promise<LeaderboardRow[]> {
  const supabase = await createClient();
  const { data: metrics, error: metricsError } = await supabase
    .from("leaderboard_metrics")
    .select("user_id, workouts_count, total_volume_kg, total_sets")
    .eq("period", period)
    .order("workouts_count", { ascending: false });

  if (metricsError) throw metricsError;
  if (!metrics?.length) return [];

  const userIds = metrics.map((m) => m.user_id);
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .in("id", userIds);

  if (profilesError) throw profilesError;

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, { username: p.username, display_name: p.display_name }])
  );

  const byConsistency = [...metrics].sort(
    (a, b) => (b.workouts_count ?? 0) - (a.workouts_count ?? 0)
  );

  return byConsistency.map((m, i) => {
    const p = profileMap.get(m.user_id);
    return {
      user_id: m.user_id,
      username: p?.username ?? "unknown",
      display_name: p?.display_name ?? null,
      workouts_count: m.workouts_count ?? 0,
      total_volume_kg: Number(m.total_volume_kg ?? 0),
      total_sets: m.total_sets ?? 0,
      rank: i + 1,
    };
  });
}

export async function getLeaderboardByVolume(
  period: LeaderboardPeriod
): Promise<LeaderboardRow[]> {
  const supabase = await createClient();
  const { data: metrics, error: metricsError } = await supabase
    .from("leaderboard_metrics")
    .select("user_id, workouts_count, total_volume_kg, total_sets")
    .eq("period", period)
    .order("total_volume_kg", { ascending: false });

  if (metricsError) throw metricsError;
  if (!metrics?.length) return [];

  const userIds = metrics.map((m) => m.user_id);
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .in("id", userIds);

  if (profilesError) throw profilesError;

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, { username: p.username, display_name: p.display_name }])
  );

  return metrics.map((m, i) => {
    const p = profileMap.get(m.user_id);
    return {
      user_id: m.user_id,
      username: p?.username ?? "unknown",
      display_name: p?.display_name ?? null,
      workouts_count: m.workouts_count ?? 0,
      total_volume_kg: Number(m.total_volume_kg ?? 0),
      total_sets: m.total_sets ?? 0,
      rank: i + 1,
    };
  });
}

export async function getMyRank(
  userId: string,
  period: LeaderboardPeriod
): Promise<number | null> {
  const rows = await getLeaderboard(period);
  const idx = rows.findIndex((r) => r.user_id === userId);
  return idx >= 0 ? idx + 1 : null;
}
