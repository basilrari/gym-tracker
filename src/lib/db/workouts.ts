import { createClient } from "@/lib/supabase/server";
import type { Workout, WorkoutWithSets } from "./types";

export type WorkoutRange = "7d" | "30d" | "all";

export async function createWorkout(
  userId: string,
  templateId?: string | null,
  name?: string
): Promise<Workout> {
  const supabase = await createClient();
  let workoutName = name ?? "Workout";

  if (templateId && !name) {
    const { data: template } = await supabase
      .from("workout_templates")
      .select("name")
      .eq("id", templateId)
      .single();
    if (template) workoutName = template.name;
  }

  const { data, error } = await supabase
    .from("workouts")
    .insert({
      user_id: userId,
      template_id: templateId ?? null,
      name: workoutName,
      start_time: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data as Workout;
}

export async function getWorkout(workoutId: string): Promise<Workout | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workouts")
    .select("*")
    .eq("id", workoutId)
    .single();

  if (error || !data) return null;
  return data as Workout;
}

export async function getWorkoutWithSets(
  workoutId: string
): Promise<WorkoutWithSets | null> {
  const workout = await getWorkout(workoutId);
  if (!workout) return null;

  const supabase = await createClient();
  const { data: sets, error } = await supabase
    .from("workout_sets")
    .select("*")
    .eq("workout_id", workoutId)
    .order("exercise_id")
    .order("set_index");

  if (error) throw error;
  return { ...workout, sets: (sets ?? []) as WorkoutWithSets["sets"] };
}

export async function getUserWorkouts(
  userId: string,
  range: WorkoutRange = "30d"
): Promise<Workout[]> {
  const supabase = await createClient();
  let query = supabase
    .from("workouts")
    .select("*")
    .eq("user_id", userId)
    .not("end_time", "is", null)
    .order("start_time", { ascending: false });

  if (range !== "all") {
    const days = range === "7d" ? 7 : 30;
    const from = new Date();
    from.setDate(from.getDate() - days);
    query = query.gte("start_time", from.toISOString());
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Workout[];
}

export async function endWorkout(workoutId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("workouts")
    .update({ end_time: new Date().toISOString() })
    .eq("id", workoutId);

  if (error) throw error;
}

export async function deleteWorkout(workoutId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("workouts").delete().eq("id", workoutId);
  if (error) throw error;
}
