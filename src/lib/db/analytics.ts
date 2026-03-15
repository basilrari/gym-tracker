import { createClient } from "@/lib/supabase/server";
import {
  subWeeks,
  startOfWeek,
  endOfWeek,
  format,
  differenceInDays,
  parseISO,
} from "date-fns";

export type WeekStat = {
  weekStart: string;
  volume: number;
  workouts: number;
  sets: number;
};

export async function getVolumeByWeek(
  userId: string,
  weeks = 12
): Promise<WeekStat[]> {
  const supabase = await createClient();
  const now = new Date();
  const result: WeekStat[] = [];

  for (let i = 0; i < weeks; i++) {
    const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

    const { data: workouts, error } = await supabase
      .from("workouts")
      .select("id, total_volume_kg")
      .eq("user_id", userId)
      .not("end_time", "is", null)
      .gte("start_time", weekStart.toISOString())
      .lte("start_time", weekEnd.toISOString());

    if (error) throw error;

    const volume = (workouts ?? []).reduce(
      (sum, w) => sum + Number(w.total_volume_kg ?? 0),
      0
    );

    const { count } = await supabase
      .from("workout_sets")
      .select("id", { count: "exact", head: true })
      .in(
        "workout_id",
        (workouts ?? []).map((w) => w.id)
      );

    result.push({
      weekStart: format(weekStart, "yyyy-MM-dd"),
      volume,
      workouts: workouts?.length ?? 0,
      sets: count ?? 0,
    });
  }

  return result.reverse();
}

export async function getWorkoutsPerWeek(
  userId: string,
  weeks = 12
): Promise<WeekStat[]> {
  return getVolumeByWeek(userId, weeks);
}

export type ExerciseProgressionPoint = {
  date: string;
  weight: number;
  volume: number;
  reps: number;
};

export async function getExerciseProgression(
  userId: string,
  exerciseId: number,
  range: "7d" | "30d" | "all" = "30d"
): Promise<ExerciseProgressionPoint[]> {
  const supabase = await createClient();
  let query = supabase
    .from("workouts")
    .select("id, start_time")
    .eq("user_id", userId)
    .not("end_time", "is", null)
    .order("start_time", { ascending: true });

  if (range !== "all") {
    const days = range === "7d" ? 7 : 30;
    const from = new Date();
    from.setDate(from.getDate() - days);
    query = query.gte("start_time", from.toISOString());
  }

  const { data: workouts, error: wError } = await query;
  if (wError) throw wError;
  if (!workouts?.length) return [];

  const { data: sets, error: sError } = await supabase
    .from("workout_sets")
    .select("workout_id, weight_kg, reps, is_warmup")
    .in("workout_id", workouts.map((w) => w.id))
    .eq("exercise_id", exerciseId)
    .eq("is_warmup", false);

  if (sError) throw sError;

  const workoutMap = new Map(workouts.map((w) => [w.id, w.start_time]));

  return (sets ?? []).map((s) => ({
    date: workoutMap.get(s.workout_id)?.slice(0, 10) ?? "",
    weight: Number(s.weight_kg),
    volume: Number(s.weight_kg) * s.reps,
    reps: s.reps,
  }));
}

export async function getStreak(userId: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workouts")
    .select("start_time")
    .eq("user_id", userId)
    .not("end_time", "is", null)
    .order("start_time", { ascending: false })
    .limit(100);

  if (error) throw error;
  if (!data?.length) return 0;

  const dates = [
    ...new Set(data.map((w) => w.start_time.slice(0, 10))),
  ].sort((a, b) => b.localeCompare(a));

  const today = format(new Date(), "yyyy-MM-dd");
  const firstDate = dates[0];
  const diffFromToday = differenceInDays(parseISO(today), parseISO(firstDate));

  if (diffFromToday > 1) return 0;

  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = parseISO(dates[i - 1]);
    const curr = parseISO(dates[i]);
    const gap = differenceInDays(prev, curr);
    if (gap > 1) break;
    streak++;
  }
  return streak;
}

export type WeekStats = {
  workoutsThisWeek: number;
  volumeThisWeek: number;
  volumeLastWeek: number;
  totalWorkouts: number;
  daysSinceFirstWorkout: number;
  hasEnoughData: boolean;
};

export async function getWeekStats(userId: string): Promise<WeekStats> {
  const supabase = await createClient();
  const now = new Date();
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const lastWeekStart = subWeeks(thisWeekStart, 1);
  const lastWeekEnd = endOfWeek(lastWeekStart, { weekStartsOn: 1 });

  const { data: workoutsThisWeek } = await supabase
    .from("workouts")
    .select("id, total_volume_kg")
    .eq("user_id", userId)
    .not("end_time", "is", null)
    .gte("start_time", thisWeekStart.toISOString());

  const { data: workoutsLastWeek } = await supabase
    .from("workouts")
    .select("id, total_volume_kg")
    .eq("user_id", userId)
    .not("end_time", "is", null)
    .gte("start_time", lastWeekStart.toISOString())
    .lte("start_time", lastWeekEnd.toISOString());

  const { data: firstWorkout } = await supabase
    .from("workouts")
    .select("start_time")
    .eq("user_id", userId)
    .not("end_time", "is", null)
    .order("start_time", { ascending: true })
    .limit(1)
    .single();

  const { count: totalWorkouts } = await supabase
    .from("workouts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .not("end_time", "is", null);

  const volumeThisWeek = (workoutsThisWeek ?? []).reduce(
    (s, w) => s + Number(w.total_volume_kg ?? 0),
    0
  );
  const volumeLastWeek = (workoutsLastWeek ?? []).reduce(
    (s, w) => s + Number(w.total_volume_kg ?? 0),
    0
  );

  const daysSinceFirst = firstWorkout?.start_time
    ? differenceInDays(now, parseISO(firstWorkout.start_time))
    : 0;

  const hasEnoughData =
    (totalWorkouts ?? 0) >= 5 || daysSinceFirst >= 7;

  return {
    workoutsThisWeek: workoutsThisWeek?.length ?? 0,
    volumeThisWeek,
    volumeLastWeek,
    totalWorkouts: totalWorkouts ?? 0,
    daysSinceFirstWorkout: daysSinceFirst,
    hasEnoughData,
  };
}
