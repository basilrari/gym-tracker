import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkoutWithSets } from "@/lib/db/workouts";
import { WorkoutComplete } from "@/components/workout/workout-complete";

export default async function WorkoutCompletePage({
  params,
}: {
  params: Promise<{ workoutId: string }>;
}) {
  const { workoutId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const workout = await getWorkoutWithSets(workoutId);
  if (!workout || workout.user_id !== user.id || !workout.end_time) {
    notFound();
  }

  return <WorkoutComplete workout={workout} />;
}
