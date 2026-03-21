"use server";

import { createClient } from "@/lib/supabase/server";
import { insertSet, updateSet, deleteSet } from "@/lib/db/sets";

export async function saveSetAction(
  workoutId: string,
  exerciseId: number,
  setIndex: number,
  weightKg: number,
  reps: number,
  options?: {
    rpe?: number;
    isWarmup?: boolean;
    isFailure?: boolean;
    exerciseOrderIndex?: number;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const set = await insertSet(workoutId, exerciseId, setIndex, weightKg, reps, {
    rpe: options?.rpe,
    isWarmup: options?.isWarmup ?? false,
    isFailure: options?.isFailure ?? false,
    exerciseOrderIndex: options?.exerciseOrderIndex,
  });

  return { set };
}

export async function updateSetAction(
  setId: string,
  data: {
    weight_kg?: number;
    reps?: number;
    is_failure?: boolean;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  await updateSet(setId, data);
  return { success: true };
}

export async function deleteSetAction(setId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  await deleteSet(setId);
  return { success: true };
}
