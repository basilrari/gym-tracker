import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserWorkouts } from "@/lib/db/workouts";
import { getTemplatesForUser } from "@/lib/db/templates";
import { HistoryClient } from "@/components/history-client";
import type { Workout } from "@/lib/db/types";
import type { WorkoutTemplate } from "@/lib/db/types";

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let workouts: Workout[] = [];
  let templates: WorkoutTemplate[] = [];
  try {
    [workouts, templates] = await Promise.all([
      getUserWorkouts(user.id, "all"),
      getTemplatesForUser(user.id),
    ]);
  } catch {
    // show empty list
  }

  return (
    <HistoryClient
      workouts={workouts}
      templates={templates}
    />
  );
}
