"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { endWorkout, deleteWorkout, updateWorkout } from "@/lib/db/workouts";
import { subDays } from "date-fns";

export async function endWorkoutAction(workoutId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await endWorkout(workoutId);

  const now = new Date();
  const sevenDaysAgo = subDays(now, 7);
  const thirtyDaysAgo = subDays(now, 30);

  await supabase.rpc("upsert_leaderboard_metrics", {
    p_user_id: user.id,
    p_period: "7d",
    p_start_date: sevenDaysAgo.toISOString().slice(0, 10),
    p_end_date: now.toISOString().slice(0, 10),
  });
  await supabase.rpc("upsert_leaderboard_metrics", {
    p_user_id: user.id,
    p_period: "30d",
    p_start_date: thirtyDaysAgo.toISOString().slice(0, 10),
    p_end_date: now.toISOString().slice(0, 10),
  });

  redirect(`/workout/${workoutId}/complete`);
}

export async function deleteWorkoutAction(workoutId: string, redirectTo = "/") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await deleteWorkout(workoutId);
  revalidatePath("/history");
  revalidatePath("/progress");
  redirect(redirectTo);
}

/** For use in forms: pass workoutId as form field. */
export async function endWorkoutFromForm(formData: FormData) {
  const id = formData.get("workoutId");
  if (typeof id === "string" && id) await endWorkoutAction(id);
}

/** For use in forms: pass workoutId as form field. */
export async function deleteWorkoutFromForm(formData: FormData) {
  const id = formData.get("workoutId");
  const next = formData.get("redirectTo");
  const redirectTo = typeof next === "string" && next.startsWith("/") ? next : "/";
  if (typeof id === "string" && id) await deleteWorkoutAction(id, redirectTo);
}

export async function updateWorkoutAction(
  workoutId: string,
  name: string,
  notes?: string | null
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const patch: Parameters<typeof updateWorkout>[1] = {
    name: name.trim() || "Workout",
  };
  if (notes !== undefined) patch.notes = notes;
  await updateWorkout(workoutId, patch);
  revalidatePath("/history");
  revalidatePath("/");
  revalidatePath("/progress");
}
