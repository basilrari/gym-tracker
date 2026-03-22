import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/db/profiles";
import { getTemplatesForUser } from "@/lib/db/templates";
import { getWeekStats, getStreak, getTrainingDaysLast30, getDailyVolumeLast7 } from "@/lib/db/analytics";
import { listBodyWeights } from "@/lib/db/body-weights";
import { getLeaderboard, getMyRank } from "@/lib/db/leaderboards";
import { startWorkoutAction } from "@/app/actions/workouts";
import { HomeClient } from "@/components/home-client";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    profile,
    templates,
    weekStats,
    streak,
    leaderboardConsistency,
    leaderboardVolume,
    myRank,
    trainingDays30,
    volumeSparkline7,
    bodyWeightsRaw,
  ] = await Promise.all([
    getProfile(user.id),
    getTemplatesForUser(user.id),
    getWeekStats(user.id),
    getStreak(user.id),
    getLeaderboard("7d"),
    import("@/lib/db/leaderboards").then((m) => m.getLeaderboardByVolume("7d")),
    getMyRank(user.id, "7d"),
    getTrainingDaysLast30(user.id),
    getDailyVolumeLast7(user.id),
    listBodyWeights(user.id, 14),
  ]);

  const bodyWeightTrend = [...bodyWeightsRaw].reverse();

  const dayOfWeekDb = (() => {
    const d = new Date().getDay();
    return d === 0 ? 7 : d;
  })();
  const suggestedTemplate =
    templates.find(
      (t) =>
        !t.scheduled_days?.length || t.scheduled_days.includes(dayOfWeekDb)
    ) ?? templates[0] ?? null;

  return (
    <HomeClient
      profile={profile}
      templates={templates}
      weekStats={weekStats}
      streak={streak}
      leaderboardConsistency={leaderboardConsistency}
      leaderboardVolume={leaderboardVolume}
      myRank={myRank}
      suggestedTemplate={suggestedTemplate}
      startWorkoutAction={startWorkoutAction}
      trainingDays30={trainingDays30}
      volumeSparkline7={volumeSparkline7}
      bodyWeightTrend={bodyWeightTrend}
    />
  );
}
