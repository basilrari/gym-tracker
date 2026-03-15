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

/** Use from forms with hidden inputs: templateId, templateName */
export async function startWorkoutFromForm(formData: FormData) {
  const templateId = formData.get("templateId") as string | null;
  const templateName = formData.get("templateName") as string | null;
  await startWorkoutAction(
    templateId && templateId.length > 0 ? templateId : null,
    (templateName as string) || undefined
  );
}

/** Start an empty workout (no template). */
export async function startWorkoutEmptyForm() {
  await startWorkoutAction(null, "Custom workout");
}
