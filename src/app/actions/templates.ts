"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkoutWithSets } from "@/lib/db/workouts";
import {
  getTemplate,
  updateTemplate,
  forkTemplate,
  updateTemplateExercise,
  removeTemplateExercise,
  addTemplateExercise,
  reorderTemplateExercises,
  createTemplate,
  createTemplateExerciseWithSets,
  addTemplateExerciseSet,
  updateTemplateExerciseSet,
  removeTemplateExerciseSet,
} from "@/lib/db/templates";

export async function updateTemplateAction(
  templateId: string,
  data: { name?: string; description?: string | null; scheduled_days?: number[] }
): Promise<{ redirectTo?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const template = await getTemplate(templateId);
  if (!template) throw new Error("Template not found");

  if (template.user_id === null) {
    const { newId } = await forkTemplate(templateId, user.id, data);
    revalidatePath("/");
    revalidatePath("/templates");
    revalidatePath(`/templates/${newId}`);
    return { redirectTo: `/templates/${newId}` };
  }

  await updateTemplate(templateId, data);
  revalidatePath("/");
  revalidatePath("/templates");
  revalidatePath(`/templates/${templateId}`);
  return {};
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
): Promise<{ redirectTo?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: row, error: rowErr } = await supabase
    .from("template_exercises")
    .select("template_id")
    .eq("id", templateExerciseId)
    .single();
  if (rowErr || !row) throw new Error("Exercise not found");
  const templateId = row.template_id as string;

  const template = await getTemplate(templateId);
  if (!template) throw new Error("Template not found");

  if (template.user_id === null) {
    const { newId, oldTeIdToNewTeId } = await forkTemplate(templateId, user.id);
    const newTeId = oldTeIdToNewTeId[templateExerciseId];
    if (newTeId) await updateTemplateExercise(newTeId, data);
    revalidatePath("/");
    revalidatePath("/templates");
    revalidatePath(`/templates/${newId}`);
    return { redirectTo: `/templates/${newId}` };
  }

  await updateTemplateExercise(templateExerciseId, data);
  revalidatePath("/templates");
  revalidatePath(`/templates/${templateId}`);
  return {};
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
): Promise<{ redirectTo?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const template = await getTemplate(templateId);
    if (!template) return { error: "Template not found" };

    if (template.user_id === null) {
      const { newId, oldTeIdToNewTeId } = await forkTemplate(templateId, user.id);
      const orderedNewIds = orderedIds
        .map((oldId) => oldTeIdToNewTeId[oldId])
        .filter((id): id is string => Boolean(id));
      if (orderedNewIds.length > 0) {
        await reorderTemplateExercises(newId, orderedNewIds);
      }
      revalidatePath("/");
      revalidatePath("/templates");
      revalidatePath(`/templates/${newId}`);
      return { redirectTo: `/templates/${newId}` };
    }

    await reorderTemplateExercises(templateId, orderedIds);
    revalidatePath("/");
    revalidatePath("/templates");
    revalidatePath(`/templates/${templateId}`);
    return {};
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save order.";
    return { error: message };
  }
}

export async function addTemplateExerciseSetAction(
  templateExerciseId: string,
  setIndex: number,
  options?: { repsMin?: number | null; repsMax?: number | null; weightKg?: number | null; tag?: string }
): Promise<{ redirectTo?: string }> {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("template_exercises")
    .select("template_id")
    .eq("id", templateExerciseId)
    .single();

  const templateId = row?.template_id as string | undefined;
  const template = templateId ? await getTemplate(templateId) : null;

  if (template?.user_id === null) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    const { newId, oldTeIdToNewTeId } = await forkTemplate(templateId!, user.id);
    const newTeId = oldTeIdToNewTeId[templateExerciseId];
    if (newTeId) {
      await addTemplateExerciseSet(newTeId, setIndex, options?.repsMin, options?.repsMax, options?.weightKg, options?.tag ?? "warmup");
    }
    revalidatePath("/");
    revalidatePath("/templates");
    revalidatePath(`/templates/${newId}`);
    return { redirectTo: `/templates/${newId}` };
  }

  await addTemplateExerciseSet(
    templateExerciseId,
    setIndex,
    options?.repsMin,
    options?.repsMax,
    options?.weightKg,
    options?.tag ?? "warmup"
  );
  revalidatePath("/templates");
  if (templateId) revalidatePath(`/templates/${templateId}`);
  return {};
}

export async function updateTemplateExerciseSetAction(
  setId: string,
  data: { reps_min?: number | null; reps_max?: number | null; weight_kg?: number | null; tag?: string; set_index?: number }
) {
  await updateTemplateExerciseSet(setId, data);
  revalidatePath("/templates");
}

export async function removeTemplateExerciseSetAction(setId: string) {
  await removeTemplateExerciseSet(setId);
  revalidatePath("/templates");
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

  // Group sets by exercise_id; keep set_index for ordering
  const byExercise = new Map<
    number,
    { sets: { set_index: number; reps_min: number; reps_max: number; weight_kg: number; tag: string }[] }
  >();
  for (const s of workout.sets) {
    const tag: string = s.is_warmup ? "warmup" : s.is_failure ? "failure" : "light";
    const setEntry = {
      set_index: s.set_index,
      reps_min: s.reps,
      reps_max: s.reps,
      weight_kg: s.weight_kg,
      tag,
    };
    const cur = byExercise.get(s.exercise_id);
    if (!cur) {
      byExercise.set(s.exercise_id, { sets: [setEntry] });
    } else {
      cur.sets.push(setEntry);
    }
  }
  const exerciseOrder = [...workout.sets]
    .sort((a, b) => (a.exercise_id !== b.exercise_id ? a.exercise_id - b.exercise_id : a.set_index - b.set_index))
    .reduce((acc, s) => (acc.includes(s.exercise_id) ? acc : [...acc, s.exercise_id]), [] as number[]);

  for (let i = 0; i < exerciseOrder.length; i++) {
    const exerciseId = exerciseOrder[i];
    const { sets } = byExercise.get(exerciseId)!;
    const sorted = [...sets].sort((a, b) => a.set_index - b.set_index).map(({ set_index: _idx, ...rest }) => rest);
    await createTemplateExerciseWithSets(template.id, exerciseId, i, sorted);
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

  const byExercise = new Map<
    number,
    { sets: { set_index: number; reps_min: number; reps_max: number; weight_kg: number; tag: string }[] }
  >();
  for (const s of workout.sets) {
    const tag: string = s.is_warmup ? "warmup" : s.is_failure ? "failure" : "light";
    const setEntry = {
      set_index: s.set_index,
      reps_min: s.reps,
      reps_max: s.reps,
      weight_kg: s.weight_kg,
      tag,
    };
    const cur = byExercise.get(s.exercise_id);
    if (!cur) {
      byExercise.set(s.exercise_id, { sets: [setEntry] });
    } else {
      cur.sets.push(setEntry);
    }
  }
  const exerciseOrder = [...workout.sets]
    .sort((a, b) => (a.exercise_id !== b.exercise_id ? a.exercise_id - b.exercise_id : a.set_index - b.set_index))
    .reduce((acc, s) => (acc.includes(s.exercise_id) ? acc : [...acc, s.exercise_id]), [] as number[]);

  for (const exerciseId of exerciseOrder) {
    const { sets } = byExercise.get(exerciseId)!;
    const sorted = [...sets].sort((a, b) => a.set_index - b.set_index).map(({ set_index: _idx, ...rest }) => rest);
    await createTemplateExerciseWithSets(templateId, exerciseId, nextOrderIndex, sorted);
    nextOrderIndex += 1;
  }

  revalidatePath("/templates");
  revalidatePath(`/templates/${templateId}`);
  redirect(`/templates/${templateId}`);
}
