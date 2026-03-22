"use server";

import { createClient } from "@/lib/supabase/server";
import { getWorkoutWithSets } from "@/lib/db/workouts";

export type WorkoutHistoryDetail = {
  workout: NonNullable<Awaited<ReturnType<typeof getWorkoutWithSets>>>;
  exerciseNames: Record<number, string>;
};

export async function getWorkoutHistoryDetailAction(
  workoutId: string
): Promise<WorkoutHistoryDetail | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const w = await getWorkoutWithSets(workoutId);
  if (!w || w.user_id !== user.id || !w.end_time) return null;

  const ids = [...new Set(w.sets.map((s) => s.exercise_id))];
  if (ids.length === 0) {
    return { workout: w, exerciseNames: {} };
  }

  const { data: exRows, error } = await supabase.from("exercises").select("id, name").in("id", ids);
  if (error) throw error;

  const exerciseNames: Record<number, string> = {};
  for (const e of exRows ?? []) {
    exerciseNames[Number(e.id)] = String(e.name);
  }
  return { workout: w, exerciseNames };
}
