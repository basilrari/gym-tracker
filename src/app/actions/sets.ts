"use server";

import { createClient } from "@/lib/supabase/server";
import { insertSet } from "@/lib/db/sets";

export async function saveSetAction(
  workoutId: string,
  exerciseId: number,
  setIndex: number,
  weightKg: number,
  reps: number,
  options?: { rpe?: number; isWarmup?: boolean; isFailure?: boolean }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const set = await insertSet(workoutId, exerciseId, setIndex, weightKg, reps, {
    rpe: options?.rpe,
    isWarmup: options?.isWarmup ?? false,
    isFailure: options?.isFailure ?? false,
  });

  return { set };
}
