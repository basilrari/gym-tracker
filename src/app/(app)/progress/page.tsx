import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getWeekStats,
  getVolumeByWeek,
  getWorkoutsPerWeek,
  getExerciseProgression,
  getTrainingDaysLast30,
  getStreak,
} from "@/lib/db/analytics";
import { getExercises } from "@/lib/db/exercises";
import { getMeasurements } from "@/lib/db/body-measurements";
import { listBodyWeights } from "@/lib/db/body-weights";
import { ProgressClient } from "@/components/progress-client";

export default async function ProgressPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    weekStats,
    volumeByWeek,
    workoutsPerWeek,
    exercises,
    measurements,
    bodyWeights,
    training30,
    streak,
  ] = await Promise.all([
    getWeekStats(user.id),
    getVolumeByWeek(user.id, 12),
    getWorkoutsPerWeek(user.id, 12),
    getExercises(),
    getMeasurements(user.id),
    listBodyWeights(user.id, 120),
    getTrainingDaysLast30(user.id),
    getStreak(user.id),
  ]);

  const exerciseProgression =
    exercises.length > 0
      ? await getExerciseProgression(user.id, exercises[0].id, "30d")
      : [];

  return (
    <ProgressClient
      weekStats={weekStats}
      volumeByWeek={volumeByWeek}
      workoutsPerWeek={workoutsPerWeek}
      exercises={exercises}
      exerciseProgression={exerciseProgression}
      measurements={measurements}
      bodyWeights={bodyWeights}
      trainingDays30={training30}
      streak={streak}
    />
  );
}
