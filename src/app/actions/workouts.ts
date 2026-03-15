"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createWorkout } from "@/lib/db/workouts";

export async function startWorkoutAction(
  templateId?: string | null,
  name?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workout = await createWorkout(user.id, templateId ?? null, name);
  redirect(`/workout/${workout.id}`);
}
