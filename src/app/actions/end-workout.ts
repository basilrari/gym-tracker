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

export async function deleteWorkoutAction(workoutId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await deleteWorkout(workoutId);
  redirect("/");
}

/** For use in forms: pass workoutId as form field. */
export async function endWorkoutFromForm(formData: FormData) {
  const id = formData.get("workoutId");
  if (typeof id === "string" && id) await endWorkoutAction(id);
}

/** For use in forms: pass workoutId as form field. */
export async function deleteWorkoutFromForm(formData: FormData) {
  const id = formData.get("workoutId");
  if (typeof id === "string" && id) await deleteWorkoutAction(id);
}

export async function updateWorkoutAction(workoutId: string, name: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await updateWorkout(workoutId, { name: name.trim() || "Workout" });
  revalidatePath("/history");
  revalidatePath("/");
}
