import { createClient } from "@/lib/supabase/server";
import type { WorkoutSet } from "./types";

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
  }
): Promise<WorkoutSet> {
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

export async function getSetsForWorkout(
  workoutId: string
): Promise<WorkoutSet[]> {
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
