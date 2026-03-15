import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkoutWithSets } from "@/lib/db/workouts";
import { getTemplateWithExercises } from "@/lib/db/templates";
import { getExerciseHistory } from "@/lib/db/exercises";
import { getProfile } from "@/lib/db/profiles";
import { WorkoutLogger } from "@/components/workout/workout-logger";

export default async function WorkoutPage({
  params,
}: {
  params: Promise<{ workoutId: string }>;
}) {
  const { workoutId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workout = await getWorkoutWithSets(workoutId);
  if (!workout || workout.user_id !== user.id) {
    notFound();
  }

  const profile = await getProfile(user.id);
  const restTimerSeconds = profile?.rest_timer_seconds ?? 90;

  let templateExercises: NonNullable<Awaited<ReturnType<typeof getTemplateWithExercises>>>["exercises"] = [];
  const historyMap: Record<number, Awaited<ReturnType<typeof getExerciseHistory>>> = {};

  if (workout.template_id) {
    const template = await getTemplateWithExercises(workout.template_id);
    if (template) {
      templateExercises = template.exercises;
      await Promise.all(
        templateExercises.map(async (te) => {
          historyMap[te.exercise_id] = await getExerciseHistory(
            user.id,
            te.exercise_id,
            3
          );
        })
      );
    }
  }

  return (
    <WorkoutLogger
      workout={workout}
      templateExercises={templateExercises}
      historyMap={historyMap}
      restTimerSeconds={restTimerSeconds}
    />
  );
}
