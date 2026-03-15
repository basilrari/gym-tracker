"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkoutWithSets } from "@/lib/db/workouts";
import {
  updateTemplate,
  updateTemplateExercise,
  removeTemplateExercise,
  addTemplateExercise,
  reorderTemplateExercises,
  createTemplate,
} from "@/lib/db/templates";

export async function updateTemplateAction(
  templateId: string,
  data: { name?: string; description?: string | null; scheduled_days?: number[] }
) {
  await updateTemplate(templateId, data);
  revalidatePath("/");
  revalidatePath("/templates");
  revalidatePath(`/templates/${templateId}`);
}

export async function updateTemplateExerciseAction(
  templateExerciseId: string,
  data: {
    target_sets?: number;
    target_reps_min?: number;
    target_reps_max?: number;
    is_warmup?: boolean;
    display_name?: string | null;
  }
) {
  await updateTemplateExercise(templateExerciseId, data);
  revalidatePath("/templates");
}

export async function removeTemplateExerciseAction(
  templateExerciseId: string
) {
  await removeTemplateExercise(templateExerciseId);
}

export async function addTemplateExerciseAction(
  templateId: string,
  exerciseId: number,
  orderIndex: number,
  options?: {
    targetSets?: number;
    targetRepsMin?: number;
    targetRepsMax?: number;
    isWarmup?: boolean;
  }
) {
  await addTemplateExercise(
    templateId,
    exerciseId,
    orderIndex,
    options?.targetSets ?? 1,
    options?.targetRepsMin,
    options?.targetRepsMax,
    options?.isWarmup ?? false
  );
}

export async function reorderTemplateExercisesAction(
  templateId: string,
  orderedIds: string[]
) {
  await reorderTemplateExercises(templateId, orderedIds);
  revalidatePath("/");
  revalidatePath("/templates");
  revalidatePath(`/templates/${templateId}`);
}

export async function createTemplateAction(name?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const template = await createTemplate(user.id, name?.trim() || "New routine");
  revalidatePath("/");
  revalidatePath("/templates");
  redirect(`/templates/${template.id}`);
}

/** For use in forms: creates a new routine and redirects to it. */
export async function createTemplateFormAction() {
  await createTemplateAction();
}

/** Create a new template from a completed workout (exercises + set counts). */
export async function createTemplateFromWorkoutAction(
  workoutId: string,
  templateName: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workout = await getWorkoutWithSets(workoutId);
  if (!workout || workout.user_id !== user.id || !workout.end_time) {
    redirect("/history");
  }

  const template = await createTemplate(
    user.id,
    templateName.trim() || workout.name,
    `From workout ${new Date(workout.start_time).toLocaleDateString()}`
  );

  // Group sets by exercise_id, order by first set_index
  const byExercise = new Map<number, { count: number; minIndex: number }>();
  for (const s of workout.sets) {
    const cur = byExercise.get(s.exercise_id);
    if (!cur) {
      byExercise.set(s.exercise_id, { count: 1, minIndex: s.set_index });
    } else {
      cur.count += 1;
      cur.minIndex = Math.min(cur.minIndex, s.set_index);
    }
  }
  const ordered = [...byExercise.entries()].sort(
    (a, b) => a[1].minIndex - b[1].minIndex
  );

  for (let i = 0; i < ordered.length; i++) {
    const [exerciseId, { count }] = ordered[i];
    await addTemplateExercise(template.id, exerciseId, i, count);
  }

  revalidatePath("/");
  revalidatePath("/templates");
  redirect(`/templates/${template.id}`);
}

/** Add exercises from a completed workout to an existing template. */
export async function addWorkoutToTemplateAction(
  workoutId: string,
  templateId: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workout = await getWorkoutWithSets(workoutId);
  if (!workout || workout.user_id !== user.id || !workout.end_time) {
    redirect("/history");
  }

  const { data: existingExercises } = await supabase
    .from("template_exercises")
    .select("order_index")
    .eq("template_id", templateId);
  const maxOrder =
    existingExercises?.length !== undefined && existingExercises.length > 0
      ? Math.max(...existingExercises.map((e) => e.order_index))
      : -1;
  let nextOrderIndex = maxOrder + 1;

  const byExercise = new Map<number, { count: number; minIndex: number }>();
  for (const s of workout.sets) {
    const cur = byExercise.get(s.exercise_id);
    if (!cur) {
      byExercise.set(s.exercise_id, { count: 1, minIndex: s.set_index });
    } else {
      cur.count += 1;
      cur.minIndex = Math.min(cur.minIndex, s.set_index);
    }
  }
  const ordered = [...byExercise.entries()].sort(
    (a, b) => a[1].minIndex - b[1].minIndex
  );

  for (const [exerciseId, { count }] of ordered) {
    await addTemplateExercise(templateId, exerciseId, nextOrderIndex, count);
    nextOrderIndex += 1;
  }

  revalidatePath("/templates");
  revalidatePath(`/templates/${templateId}`);
  redirect(`/templates/${templateId}`);
}
