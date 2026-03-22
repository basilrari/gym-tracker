import { createClient } from "@/lib/supabase/server";
import type { WorkoutSet } from "./types";
import { getWorkoutSession, insertSessionSet, updateSessionSet, deleteSessionSet } from "./workout-sessions";

export async function insertSet(
  workoutId: string,
  exerciseId: number,
  setIndex: number,
  weightKg: number,
  reps: number,
  options?: {
    rpe?: number;
    restSeconds?: number;
    isWarmup?: boolean;
    isFailure?: boolean;
    /** Preferred: stable after exercise reorder (order_index alone can desync). */
    exerciseLogId?: string;
    exerciseOrderIndex?: number;
    tags?: string[];
    remarks?: string | null;
  }
): Promise<WorkoutSet> {
  const session = await getWorkoutSession(workoutId);
  if (session) {
    const supabase = await createClient();
    let logId: string;
    if (options?.exerciseLogId) {
      const { data: log, error: logErr } = await supabase
        .from("exercise_logs")
        .select("id")
        .eq("id", options.exerciseLogId)
        .eq("session_id", workoutId)
        .single();
      if (logErr || !log) throw logErr ?? new Error("Exercise log not found");
      logId = log.id as string;
    } else if (options?.exerciseOrderIndex !== undefined) {
      const { data: log, error: logErr } = await supabase
        .from("exercise_logs")
        .select("id")
        .eq("session_id", workoutId)
        .eq("order_index", options.exerciseOrderIndex)
        .single();
      if (logErr || !log) throw logErr ?? new Error("Exercise log not found");
      logId = log.id as string;
    } else {
      throw new Error("exerciseLogId or exerciseOrderIndex required for session-based workouts");
    }

    const tags: string[] = [...(options?.tags ?? [])];
    if (options?.isWarmup) tags.push("warmup");
    if (options?.isFailure) tags.push("failure");
    const uniqueTags = [...new Set(tags.map((t) => t.trim()).filter(Boolean))];

    const row = await insertSessionSet(
      logId,
      setIndex + 1,
      reps,
      weightKg,
      {
        tags: uniqueTags,
        remarks: options?.remarks ?? null,
        restSeconds: options?.restSeconds ?? null,
      }
    );

    const outTags = row.tags ?? uniqueTags;
    return {
      id: row.id,
      workout_id: workoutId,
      exercise_id: exerciseId,
      set_index: setIndex,
      weight_kg: row.weight_kg ?? weightKg,
      reps: row.reps ?? reps,
      rpe: options?.rpe ?? null,
      rest_seconds: row.rest_seconds,
      is_warmup: outTags.includes("warmup"),
      is_failure: outTags.includes("failure"),
      created_at: row.created_at,
      session_tags: outTags,
      remarks: row.remarks ?? null,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workout_sets")
    .insert({
      workout_id: workoutId,
      exercise_id: exerciseId,
      set_index: setIndex,
      weight_kg: weightKg,
      reps,
      rpe: options?.rpe ?? null,
      rest_seconds: options?.restSeconds ?? null,
      is_warmup: options?.isWarmup ?? false,
      is_failure: options?.isFailure ?? false,
    })
    .select()
    .single();

  if (error) throw error;
  return data as WorkoutSet;
}

export async function getSetsForWorkout(workoutId: string): Promise<WorkoutSet[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workout_sets")
    .select("*")
    .eq("workout_id", workoutId)
    .order("exercise_id")
    .order("set_index");

  if (error) throw error;
  return (data ?? []) as WorkoutSet[];
}

export async function updateSet(
  setId: string,
  data: {
    weight_kg?: number;
    reps?: number;
    is_failure?: boolean;
    is_warmup?: boolean;
    tags?: string[];
    remarks?: string | null;
    rest_seconds?: number | null;
  }
): Promise<void> {
  const supabase = await createClient();
  const { data: row } = await supabase.from("sets").select("id").eq("id", setId).maybeSingle();
  if (row) {
    const { data: full } = await supabase.from("sets").select("tags").eq("id", setId).single();
    const raw = full?.tags;
    const prev = Array.isArray(raw) ? raw.map((t) => String(t)) : [];
    let tags = data.tags !== undefined ? [...data.tags] : [...prev];
    if (data.tags === undefined) {
      if (data.is_failure !== undefined) {
        tags = tags.filter((t) => t !== "failure");
        if (data.is_failure) tags.push("failure");
      }
      if (data.is_warmup !== undefined) {
        tags = tags.filter((t) => t !== "warmup");
        if (data.is_warmup) tags.push("warmup");
      }
    }
    tags = [...new Set(tags.map((t) => t.trim()).filter(Boolean))];
    const patch: Parameters<typeof updateSessionSet>[1] = {};
    if (data.weight_kg !== undefined) patch.weight_kg = data.weight_kg;
    if (data.reps !== undefined) patch.reps = data.reps;
    if (data.is_failure !== undefined || data.is_warmup !== undefined || data.tags !== undefined) patch.tags = tags;
    if (data.remarks !== undefined) patch.remarks = data.remarks;
    if (data.rest_seconds !== undefined) patch.rest_seconds = data.rest_seconds;
    await updateSessionSet(setId, patch);
    return;
  }

  const legacy: Record<string, unknown> = {};
  if (data.weight_kg !== undefined) legacy.weight_kg = data.weight_kg;
  if (data.reps !== undefined) legacy.reps = data.reps;
  if (data.is_failure !== undefined) legacy.is_failure = data.is_failure;
  if (data.is_warmup !== undefined) legacy.is_warmup = data.is_warmup;
  if (data.rest_seconds !== undefined) legacy.rest_seconds = data.rest_seconds;
  const { error } = await supabase.from("workout_sets").update(legacy).eq("id", setId);

  if (error) throw error;
}

export async function deleteSet(setId: string): Promise<void> {
  const supabase = await createClient();
  const { data: row } = await supabase.from("sets").select("id").eq("id", setId).maybeSingle();
  if (row) {
    await deleteSessionSet(setId);
    return;
  }

  const { error } = await supabase.from("workout_sets").delete().eq("id", setId);
  if (error) throw error;
}
