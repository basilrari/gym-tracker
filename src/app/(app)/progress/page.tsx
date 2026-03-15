import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/db/profiles";
import {
  getWeekStats,
  getVolumeByWeek,
  getWorkoutsPerWeek,
  getExerciseProgression,
} from "@/lib/db/analytics";
import { getExercises } from "@/lib/db/exercises";
import { getMeasurements } from "@/lib/db/body-measurements";
import { ProgressClient } from "@/components/progress-client";

export default async function ProgressPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [profile, weekStats, volumeByWeek, workoutsPerWeek, exercises, measurements] =
    await Promise.all([
      getProfile(user.id),
      getWeekStats(user.id),
      getVolumeByWeek(user.id, 12),
      getWorkoutsPerWeek(user.id, 12),
      getExercises(),
      getMeasurements(user.id),
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
    />
  );
}
