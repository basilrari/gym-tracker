import { createClient } from "@/lib/supabase/server";
import type { Exercise, WorkoutSet } from "./types";

export async function getExercises(): Promise<Exercise[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercises")
    .select("*")
    .order("name");

  if (error) throw error;
  return (data ?? []) as Exercise[];
}

export async function getExerciseById(id: number): Promise<Exercise | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercises")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as Exercise;
}

export async function createExercise(
  userId: string,
  name: string,
  equipment?: string | null
): Promise<Exercise> {
  const supabase = await createClient();
  const slug =
    name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "") || "custom";
  const { data, error } = await supabase
    .from("exercises")
    .insert({
      name: name.trim(),
      slug: `${slug}-${Date.now()}`,
      equipment: equipment?.trim() || null,
      is_default: false,
      created_by: userId,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Exercise;
}

export type ExerciseHistoryEntry = {
  workout_id: string;
  workout_date: string;
  sets: { weight_kg: number; reps: number; is_warmup: boolean }[];
};

export async function getExerciseHistory(
  userId: string,
  exerciseId: number,
  limit = 5
): Promise<ExerciseHistoryEntry[]> {
  const supabase = await createClient();
  const { data: workouts, error: workoutsError } = await supabase
    .from("workouts")
    .select("id, start_time")
    .eq("user_id", userId)
    .not("end_time", "is", null)
    .order("start_time", { ascending: false })
    .limit(limit * 3); // fetch more to account for workouts without this exercise

  if (workoutsError) throw workoutsError;
  if (!workouts?.length) return [];

  const workoutIds = workouts.map((w) => w.id);
  const { data: sets, error: setsError } = await supabase
    .from("workout_sets")
    .select("workout_id, weight_kg, reps, is_warmup")
    .in("workout_id", workoutIds)
    .eq("exercise_id", exerciseId);

  if (setsError) throw setsError;

  const setsByWorkout = new Map<string, WorkoutSet[]>();
  for (const s of sets ?? []) {
    const list = setsByWorkout.get(s.workout_id) ?? [];
    list.push(s as WorkoutSet);
    setsByWorkout.set(s.workout_id, list);
  }

  const result: ExerciseHistoryEntry[] = [];
  for (const w of workouts) {
    const workoutSets = setsByWorkout.get(w.id);
    if (workoutSets?.length) {
      result.push({
        workout_id: w.id,
        workout_date: w.start_time,
        sets: workoutSets.map((s) => ({
          weight_kg: s.weight_kg,
          reps: s.reps,
          is_warmup: s.is_warmup,
        })),
      });
      if (result.length >= limit) break;
    }
  }
  return result;
}
