"use server";

import { createClient } from "@/lib/supabase/server";
import { getWorkoutWithSets } from "@/lib/db/workouts";
import { reorderExerciseLogs, reorderSessionSets } from "@/lib/db/workout-sessions";

export async function reorderExerciseLogsAction(sessionId: string, orderedLogIds: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  await reorderExerciseLogs(sessionId, orderedLogIds);
  return { ok: true };
}

export async function reorderSessionSetsAction(exerciseLogId: string, orderedSetIds: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  await reorderSessionSets(exerciseLogId, orderedSetIds);
  return { ok: true };
}

export async function getWorkoutSetsSnapshotAction(workoutId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  type W = Awaited<ReturnType<typeof getWorkoutWithSets>>;
  if (!user)
    return {
      sets: [] as NonNullable<W>["sets"],
      exerciseLogOrder: undefined as NonNullable<W>["sessionExerciseLogOrder"],
    };
  const w = await getWorkoutWithSets(workoutId);
  if (!w || w.user_id !== user.id)
    return { sets: [] as NonNullable<W>["sets"], exerciseLogOrder: undefined };
  return {
    sets: w.sets,
    exerciseLogOrder: w.sessionExerciseLogOrder,
  };
}
