import { createClient } from "@/lib/supabase/server";
import type {
  WorkoutTemplate,
  TemplateExercise,
  TemplateExerciseSet,
  TemplateWithExercises,
  TemplateExerciseWithSets,
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

export async function getTemplate(
  templateId: string
): Promise<WorkoutTemplate | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workout_templates")
    .select("*")
    .eq("id", templateId)
    .single();

  if (error || !data) return null;
  return data as WorkoutTemplate;
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

  const teIds = (templateExercises ?? []).map((te) => te.id);
  const setsByTeId = new Map<string, TemplateExerciseSet[]>();

  const { data: setsRows, error: setsError } = await supabase
    .from("template_exercise_sets")
    .select("*")
    .in("template_exercise_id", teIds.length ? teIds : ["00000000-0000-0000-0000-000000000000"])
    .order("set_index");

  if (!setsError && setsRows?.length) {
    for (const row of setsRows) {
      const s = row as TemplateExerciseSet;
      const list = setsByTeId.get(s.template_exercise_id) ?? [];
      list.push(s);
      setsByTeId.set(s.template_exercise_id, list);
    }
    for (const list of setsByTeId.values()) {
      list.sort((a, b) => a.set_index - b.set_index);
    }
  }
  // If template_exercise_sets table is missing or query fails (e.g. migration not run), each exercise gets sets: [] and UI falls back to target_sets

  const exerciseIds = [
    ...new Set((templateExercises ?? []).map((te) => te.exercise_id)),
  ];
  let exercises: unknown[] = [];
  if (exerciseIds.length > 0) {
    const { data, error: exError } = await supabase
      .from("exercises")
      .select("*")
      .in("id", exerciseIds);
    if (exError) throw exError;
    exercises = data ?? [];
  }

  const exerciseMap = new Map(
    (exercises as Exercise[]).map((e) => [e.id, e as Exercise])
  );

  const exercisesWithDetails: TemplateExerciseWithSets[] = (templateExercises ?? [])
    .sort((a, b) => a.order_index - b.order_index)
    .map((te) => ({
      ...te,
      exercise: exerciseMap.get(te.exercise_id)!,
      sets: (setsByTeId.get(te.id) ?? []).sort((a, b) => a.set_index - b.set_index),
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

export type ForkTemplateResult = {
  newId: string;
  oldTeIdToNewTeId: Record<string, string>;
};

/** Duplicate a template (e.g. a default) to the given user so they can edit it. */
export async function forkTemplate(
  sourceTemplateId: string,
  userId: string,
  overrides?: Partial<Pick<WorkoutTemplate, "name" | "description" | "scheduled_days">>
): Promise<ForkTemplateResult> {
  const source = await getTemplateWithExercises(sourceTemplateId);
  if (!source) throw new Error("Template not found");

  const supabase = await createClient();
  const { data: newTemplate, error: tErr } = await supabase
    .from("workout_templates")
    .insert({
      user_id: userId,
      name: overrides?.name ?? source.name,
      description: overrides?.description ?? source.description ?? null,
      scheduled_days: overrides?.scheduled_days ?? source.scheduled_days ?? [],
    })
    .select("id")
    .single();

  if (tErr || !newTemplate) throw tErr ?? new Error("Failed to create template");
  const newId = (newTemplate as { id: string }).id;

  const oldTeIdToNewTeId: Record<string, string> = {};
  for (const te of source.exercises) {
    const { data: newTe, error: teErr } = await supabase
      .from("template_exercises")
      .insert({
        template_id: newId,
        exercise_id: te.exercise_id,
        order_index: te.order_index,
        target_sets: te.target_sets,
        target_reps_min: te.target_reps_min,
        target_reps_max: te.target_reps_max,
        is_warmup: te.is_warmup,
        display_name: te.display_name ?? null,
      })
      .select("id")
      .single();

    if (teErr || !newTe) throw teErr ?? new Error("Failed to copy exercise");
    oldTeIdToNewTeId[te.id] = (newTe as { id: string }).id;
  }

  for (const te of source.exercises) {
    const newTeId = oldTeIdToNewTeId[te.id];
    if (!newTeId) continue;
    for (const s of te.sets ?? []) {
      const { error: setErr } = await supabase.from("template_exercise_sets").insert({
        template_exercise_id: newTeId,
        set_index: s.set_index,
        reps_min: s.reps_min,
        reps_max: s.reps_max,
        weight_kg: s.weight_kg,
        tag: s.tag,
      });
      if (setErr) throw setErr;
    }
  }

  return { newId, oldTeIdToNewTeId };
}

export async function updateTemplate(
  templateId: string,
  data: Partial<Pick<WorkoutTemplate, "name" | "description" | "scheduled_days">>
): Promise<void> {
  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("workout_templates")
    .update(data)
    .eq("id", templateId)
    .select("id");

  if (error) throw error;
  if (!updated?.length) {
    throw new Error(
      "Template could not be updated. Default routines are read-only—duplicate this routine to edit it."
    );
  }
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
  const te = data as TemplateExercise;
  await supabase.from("template_exercise_sets").insert({
    template_exercise_id: te.id,
    set_index: 0,
    reps_min: targetRepsMin ?? null,
    reps_max: targetRepsMax ?? null,
    weight_kg: null,
    tag: isWarmup ? "warmup" : "light",
  });
  return te;
}

export async function updateTemplateExercise(
  templateExerciseId: string,
  data: Partial<
    Pick<
      TemplateExercise,
      "order_index" | "target_sets" | "target_reps_min" | "target_reps_max" | "is_warmup" | "display_name"
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
    const { data: updated, error } = await supabase
      .from("template_exercises")
      .update({ order_index: i })
      .eq("id", orderedIds[i])
      .eq("template_id", templateId)
      .select("id");

    if (error) throw error;
    if (!updated?.length) {
      throw new Error(
        "Could not save exercise order. Duplicate this routine to reorder exercises."
      );
    }
  }
}

export type TemplateSetInput = {
  reps_min?: number | null;
  reps_max?: number | null;
  weight_kg?: number | null;
  tag?: string;
};

export async function createTemplateExerciseWithSets(
  templateId: string,
  exerciseId: number,
  orderIndex: number,
  sets: TemplateSetInput[]
): Promise<TemplateExercise> {
  if (sets.length === 0) throw new Error("At least one set required");
  const supabase = await createClient();
  const first = sets[0];
  const { data: te, error: teError } = await supabase
    .from("template_exercises")
    .insert({
      template_id: templateId,
      exercise_id: exerciseId,
      order_index: orderIndex,
      target_sets: sets.length,
      target_reps_min: first.reps_min ?? null,
      target_reps_max: first.reps_max ?? null,
      is_warmup: first.tag === "warmup",
    })
    .select()
    .single();

  if (teError || !te) throw teError ?? new Error("Failed to create template exercise");
  const templateExerciseId = (te as TemplateExercise).id;

  for (let i = 0; i < sets.length; i++) {
    const s = sets[i];
    await supabase.from("template_exercise_sets").insert({
      template_exercise_id: templateExerciseId,
      set_index: i,
      reps_min: s.reps_min ?? null,
      reps_max: s.reps_max ?? null,
      weight_kg: s.weight_kg ?? null,
      tag: s.tag ?? "warmup",
    });
  }
  return te as TemplateExercise;
}

export async function addTemplateExerciseSet(
  templateExerciseId: string,
  setIndex: number,
  repsMin?: number | null,
  repsMax?: number | null,
  weightKg?: number | null,
  tag: string = "warmup"
): Promise<TemplateExerciseSet> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("template_exercise_sets")
    .insert({
      template_exercise_id: templateExerciseId,
      set_index: setIndex,
      reps_min: repsMin ?? null,
      reps_max: repsMax ?? null,
      weight_kg: weightKg ?? null,
      tag,
    })
    .select()
    .single();

  if (error) throw error;
  return data as TemplateExerciseSet;
}

export async function updateTemplateExerciseSet(
  setId: string,
  data: Partial<Pick<TemplateExerciseSet, "reps_min" | "reps_max" | "weight_kg" | "tag" | "set_index">>
): Promise<void> {
  const supabase = await createClient();
  const payload: Record<string, unknown> = {};
  if (data.reps_min !== undefined) payload.reps_min = data.reps_min;
  if (data.reps_max !== undefined) payload.reps_max = data.reps_max;
  if (data.weight_kg !== undefined) payload.weight_kg = data.weight_kg;
  if (data.tag !== undefined) payload.tag = data.tag;
  if (data.set_index !== undefined) payload.set_index = data.set_index;
  if (Object.keys(payload).length === 0) return;
  const { error } = await supabase
    .from("template_exercise_sets")
    .update(payload)
    .eq("id", setId);

  if (error) throw error;
}

export async function removeTemplateExerciseSet(setId: string): Promise<void> {
  const supabase = await createClient();
  const { data: setRow } = await supabase
    .from("template_exercise_sets")
    .select("template_exercise_id, set_index")
    .eq("id", setId)
    .single();

  const { error: delError } = await supabase
    .from("template_exercise_sets")
    .delete()
    .eq("id", setId);

  if (delError) throw delError;
  if (!setRow) return;

  const { data: rest } = await supabase
    .from("template_exercise_sets")
    .select("id, set_index")
    .eq("template_exercise_id", setRow.template_exercise_id)
    .gte("set_index", setRow.set_index)
    .order("set_index");

  for (const row of rest ?? []) {
    if (row.set_index > setRow.set_index) {
      await supabase
        .from("template_exercise_sets")
        .update({ set_index: row.set_index - 1 })
        .eq("id", row.id);
    }
  }
}
