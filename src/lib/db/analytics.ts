import { createClient } from "@/lib/supabase/server";
import {
  subWeeks,
  subDays,
  startOfWeek,
  endOfWeek,
  format,
  differenceInDays,
  parseISO,
  startOfDay,
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

    const { data: sessions, error: sErr } = await supabase
      .from("workout_sessions")
      .select("id, total_volume_kg")
      .eq("user_id", userId)
      .not("ended_at", "is", null)
      .gte("started_at", weekStart.toISOString())
      .lte("started_at", weekEnd.toISOString());

    if (sErr) throw sErr;

    const legacyVol = (workouts ?? []).reduce((sum, w) => sum + Number(w.total_volume_kg ?? 0), 0);
    const sessionVol = (sessions ?? []).reduce((sum, w) => sum + Number(w.total_volume_kg ?? 0), 0);
    const volume = legacyVol + sessionVol;

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
      workouts: (workouts?.length ?? 0) + (sessions?.length ?? 0),
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
  const fromIso =
    range === "all"
      ? null
      : (() => {
          const days = range === "7d" ? 7 : 30;
          const from = new Date();
          from.setDate(from.getDate() - days);
          return from.toISOString();
        })();

  let legacyQuery = supabase
    .from("workouts")
    .select("id, start_time")
    .eq("user_id", userId)
    .not("end_time", "is", null)
    .order("start_time", { ascending: true });
  if (fromIso) legacyQuery = legacyQuery.gte("start_time", fromIso);

  let sessionQuery = supabase
    .from("workout_sessions")
    .select("id, started_at")
    .eq("user_id", userId)
    .not("ended_at", "is", null)
    .order("started_at", { ascending: true });
  if (fromIso) sessionQuery = sessionQuery.gte("started_at", fromIso);

  const [{ data: workouts, error: wError }, { data: sessions, error: sessErr }] = await Promise.all([
    legacyQuery,
    sessionQuery,
  ]);
  if (wError) throw wError;
  if (sessErr) throw sessErr;

  const points: ExerciseProgressionPoint[] = [];

  if (workouts?.length) {
    const { data: sets, error: sError } = await supabase
      .from("workout_sets")
      .select("workout_id, weight_kg, reps, is_warmup")
      .in(
        "workout_id",
        workouts.map((w) => w.id)
      )
      .eq("exercise_id", exerciseId)
      .eq("is_warmup", false);
    if (sError) throw sError;
    const workoutMap = new Map(workouts.map((w) => [w.id, w.start_time]));
    for (const s of sets ?? []) {
      points.push({
        date: workoutMap.get(s.workout_id)?.slice(0, 10) ?? "",
        weight: Number(s.weight_kg),
        volume: Number(s.weight_kg) * s.reps,
        reps: s.reps,
      });
    }
  }

  if (sessions?.length) {
    const sessionIds = sessions.map((s) => s.id);
    const sessionTime = new Map(sessions.map((s) => [s.id, s.started_at]));
    const { data: logs, error: lErr } = await supabase
      .from("exercise_logs")
      .select("id, session_id")
      .in("session_id", sessionIds)
      .eq("exercise_id", exerciseId);
    if (lErr) throw lErr;
    if (logs?.length) {
      const logToSession = new Map(logs.map((l) => [l.id, l.session_id as string]));
      const logIds = logs.map((l) => l.id);
      const { data: sessSets, error: ssErr } = await supabase
        .from("sets")
        .select("exercise_log_id, weight_kg, reps, tags")
        .in("exercise_log_id", logIds);
      if (ssErr) throw ssErr;
      for (const s of sessSets ?? []) {
        const tags = Array.isArray(s.tags) ? s.tags.map(String) : [];
        if (tags.includes("warmup")) continue;
        const sid = logToSession.get(s.exercise_log_id as string);
        const started = sid ? sessionTime.get(sid) : null;
        const w = s.weight_kg != null ? Number(s.weight_kg) : 0;
        const r = s.reps != null ? Number(s.reps) : 0;
        points.push({
          date: started?.slice(0, 10) ?? "",
          weight: w,
          volume: w * r,
          reps: r,
        });
      }
    }
  }

  points.sort((a, b) => a.date.localeCompare(b.date));
  return points;
}

export async function getStreak(userId: string): Promise<number> {
  const supabase = await createClient();
  const [{ data: legacy, error }, { data: sess, error: sErr }] = await Promise.all([
    supabase
      .from("workouts")
      .select("start_time")
      .eq("user_id", userId)
      .not("end_time", "is", null)
      .order("start_time", { ascending: false })
      .limit(150),
    supabase
      .from("workout_sessions")
      .select("started_at")
      .eq("user_id", userId)
      .not("ended_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(150),
  ]);

  if (error) throw error;
  if (sErr) throw sErr;

  const allTimes = [
    ...(legacy ?? []).map((w) => w.start_time),
    ...(sess ?? []).map((s) => s.started_at),
  ];
  if (!allTimes.length) return 0;

  const dates = [...new Set(allTimes.map((t) => t.slice(0, 10)))].sort((a, b) =>
    b.localeCompare(a)
  );

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

  const [
    { data: workoutsThisWeek },
    { data: sessionsThisWeek },
    { data: workoutsLastWeek },
    { data: sessionsLastWeek },
    { data: firstWorkout },
    { data: firstSession },
    { count: totalLegacy },
    { count: totalSessions },
  ] = await Promise.all([
    supabase
      .from("workouts")
      .select("id, total_volume_kg")
      .eq("user_id", userId)
      .not("end_time", "is", null)
      .gte("start_time", thisWeekStart.toISOString()),
    supabase
      .from("workout_sessions")
      .select("id, total_volume_kg")
      .eq("user_id", userId)
      .not("ended_at", "is", null)
      .gte("started_at", thisWeekStart.toISOString()),
    supabase
      .from("workouts")
      .select("id, total_volume_kg")
      .eq("user_id", userId)
      .not("end_time", "is", null)
      .gte("start_time", lastWeekStart.toISOString())
      .lte("start_time", lastWeekEnd.toISOString()),
    supabase
      .from("workout_sessions")
      .select("id, total_volume_kg")
      .eq("user_id", userId)
      .not("ended_at", "is", null)
      .gte("started_at", lastWeekStart.toISOString())
      .lte("started_at", lastWeekEnd.toISOString()),
    supabase
      .from("workouts")
      .select("start_time")
      .eq("user_id", userId)
      .not("end_time", "is", null)
      .order("start_time", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("workout_sessions")
      .select("started_at")
      .eq("user_id", userId)
      .not("ended_at", "is", null)
      .order("started_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("workouts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .not("end_time", "is", null),
    supabase
      .from("workout_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .not("ended_at", "is", null),
  ]);

  const volumeThisWeek =
    (workoutsThisWeek ?? []).reduce((s, w) => s + Number(w.total_volume_kg ?? 0), 0) +
    (sessionsThisWeek ?? []).reduce((s, w) => s + Number(w.total_volume_kg ?? 0), 0);
  const volumeLastWeek =
    (workoutsLastWeek ?? []).reduce((s, w) => s + Number(w.total_volume_kg ?? 0), 0) +
    (sessionsLastWeek ?? []).reduce((s, w) => s + Number(w.total_volume_kg ?? 0), 0);

  const firstLegacy = firstWorkout?.start_time;
  const firstSess = firstSession?.started_at;
  let firstTs: string | null = null;
  if (firstLegacy && firstSess) {
    firstTs = firstLegacy < firstSess ? firstLegacy : firstSess;
  } else firstTs = firstLegacy ?? firstSess ?? null;

  const daysSinceFirst = firstTs ? differenceInDays(now, parseISO(firstTs)) : 0;

  const totalWorkouts = (totalLegacy ?? 0) + (totalSessions ?? 0);

  const hasEnoughData = totalWorkouts >= 5 || daysSinceFirst >= 7;

  return {
    workoutsThisWeek: (workoutsThisWeek?.length ?? 0) + (sessionsThisWeek?.length ?? 0),
    volumeThisWeek,
    volumeLastWeek,
    totalWorkouts,
    daysSinceFirstWorkout: daysSinceFirst,
    hasEnoughData,
  };
}

export type TrainingDay = { date: string; trained: boolean };

/** Last 30 calendar days (oldest → newest); `trained` if any completed workout that local day. */
export async function getTrainingDaysLast30(userId: string): Promise<TrainingDay[]> {
  const supabase = await createClient();
  const today = startOfDay(new Date());
  const from = subDays(today, 29);
  const [{ data: legacy, error: e1 }, { data: sess, error: e2 }] = await Promise.all([
    supabase
      .from("workouts")
      .select("start_time")
      .eq("user_id", userId)
      .not("end_time", "is", null)
      .gte("start_time", from.toISOString()),
    supabase
      .from("workout_sessions")
      .select("started_at")
      .eq("user_id", userId)
      .not("ended_at", "is", null)
      .gte("started_at", from.toISOString()),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  const trainedSet = new Set<string>();
  for (const w of legacy ?? []) trainedSet.add(w.start_time.slice(0, 10));
  for (const s of sess ?? []) trainedSet.add(s.started_at.slice(0, 10));
  const out: TrainingDay[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = format(subDays(today, i), "yyyy-MM-dd");
    out.push({ date: d, trained: trainedSet.has(d) });
  }
  return out;
}

/** Daily total volume (kg) for last 7 days, index 0 = oldest. Merges legacy + sessions. */
export async function getDailyVolumeLast7(userId: string): Promise<number[]> {
  const supabase = await createClient();
  const today = startOfDay(new Date());
  const from = subDays(today, 6);
  const [{ data: legacy, error: e1 }, { data: sessions, error: e2 }] = await Promise.all([
    supabase
      .from("workouts")
      .select("start_time, total_volume_kg")
      .eq("user_id", userId)
      .not("end_time", "is", null)
      .gte("start_time", from.toISOString()),
    supabase
      .from("workout_sessions")
      .select("started_at, total_volume_kg")
      .eq("user_id", userId)
      .not("ended_at", "is", null)
      .gte("started_at", from.toISOString()),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  const byDay = new Map<string, number>();
  for (const w of legacy ?? []) {
    const d = w.start_time.slice(0, 10);
    byDay.set(d, (byDay.get(d) ?? 0) + Number(w.total_volume_kg ?? 0));
  }
  for (const s of sessions ?? []) {
    const d = s.started_at.slice(0, 10);
    byDay.set(d, (byDay.get(d) ?? 0) + Number(s.total_volume_kg ?? 0));
  }
  const vols: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = format(subDays(today, i), "yyyy-MM-dd");
    vols.push(byDay.get(d) ?? 0);
  }
  return vols;
}
