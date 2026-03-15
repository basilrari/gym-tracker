"use server";

import { createClient } from "@/lib/supabase/server";
import { createExercise } from "@/lib/db/exercises";
import { revalidatePath } from "next/cache";

export async function createExerciseAction(
  name: string,
  equipment?: string | null
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const exercise = await createExercise(user.id, name, equipment);
  revalidatePath("/templates");
  return exercise;
}
