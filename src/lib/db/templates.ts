import { createClient } from "@/lib/supabase/server";
import type {
  WorkoutTemplate,
  TemplateExercise,
  TemplateWithExercises,
  Exercise,
} from "./types";

export async function getTemplatesForUser(
  userId: string
): Promise<WorkoutTemplate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workout_templates")
    .select("*")
    .or(`user_id.eq.${userId},user_id.is.null`)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as WorkoutTemplate[];
}

export async function getTemplateWithExercises(
  templateId: string
): Promise<TemplateWithExercises | null> {
  const supabase = await createClient();
  const { data: template, error: templateError } = await supabase
    .from("workout_templates")
    .select("*")
    .eq("id", templateId)
    .single();

  if (templateError || !template) return null;

  const { data: templateExercises, error: teError } = await supabase
    .from("template_exercises")
    .select("*")
    .eq("template_id", templateId)
    .order("order_index");

  if (teError) throw teError;

  const exerciseIds = [
    ...new Set((templateExercises ?? []).map((te) => te.exercise_id)),
  ];
  const { data: exercises, error: exError } = await supabase
    .from("exercises")
    .select("*")
    .in("id", exerciseIds);

  if (exError) throw exError;

  const exerciseMap = new Map(
    (exercises ?? []).map((e) => [e.id, e as Exercise])
  );

  const exercisesWithDetails = (templateExercises ?? [])
    .sort((a, b) => a.order_index - b.order_index)
    .map((te) => ({
      ...te,
      exercise: exerciseMap.get(te.exercise_id)!,
    }))
    .filter((te) => te.exercise);

  return {
    ...template,
    exercises: exercisesWithDetails,
  } as TemplateWithExercises;
}

export async function createTemplate(
  userId: string,
  name: string,
  description?: string
): Promise<WorkoutTemplate> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workout_templates")
    .insert({ user_id: userId, name, description: description ?? null })
    .select()
    .single();

  if (error) throw error;
  return data as WorkoutTemplate;
}

export async function updateTemplate(
  templateId: string,
  data: Partial<Pick<WorkoutTemplate, "name" | "description">>
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("workout_templates")
    .update(data)
    .eq("id", templateId);

  if (error) throw error;
}

export async function addTemplateExercise(
  templateId: string,
  exerciseId: number,
  orderIndex: number,
  targetSets = 1,
  targetRepsMin?: number,
  targetRepsMax?: number,
  isWarmup = false
): Promise<TemplateExercise> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("template_exercises")
    .insert({
      template_id: templateId,
      exercise_id: exerciseId,
      order_index: orderIndex,
      target_sets: targetSets,
      target_reps_min: targetRepsMin ?? null,
      target_reps_max: targetRepsMax ?? null,
      is_warmup: isWarmup,
    })
    .select()
    .single();

  if (error) throw error;
  return data as TemplateExercise;
}

export async function updateTemplateExercise(
  templateExerciseId: string,
  data: Partial<
    Pick<
      TemplateExercise,
      "order_index" | "target_sets" | "target_reps_min" | "target_reps_max" | "is_warmup"
    >
  >
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("template_exercises")
    .update(data)
    .eq("id", templateExerciseId);

  if (error) throw error;
}

export async function removeTemplateExercise(
  templateExerciseId: string
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("template_exercises")
    .delete()
    .eq("id", templateExerciseId);

  if (error) throw error;
}

export async function reorderTemplateExercises(
  templateId: string,
  orderedIds: string[]
): Promise<void> {
  const supabase = await createClient();
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("template_exercises")
      .update({ order_index: i })
      .eq("id", orderedIds[i])
      .eq("template_id", templateId);

    if (error) throw error;
  }
}
