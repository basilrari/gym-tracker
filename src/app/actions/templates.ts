"use server";

import { revalidatePath } from "next/cache";
import {
  updateTemplate,
  updateTemplateExercise,
  removeTemplateExercise,
  addTemplateExercise,
  reorderTemplateExercises,
} from "@/lib/db/templates";

export async function updateTemplateAction(
  templateId: string,
  data: { name?: string; description?: string; scheduled_days?: number[] }
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
  }
) {
  await updateTemplateExercise(templateExerciseId, data);
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
}
