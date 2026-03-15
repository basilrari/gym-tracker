import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/db/profiles";
import { getTemplatesForUser } from "@/lib/db/templates";
import { getWeekStats, getStreak } from "@/lib/db/analytics";
import { getLeaderboard, getMyRank } from "@/lib/db/leaderboards";
import { startWorkoutAction } from "@/app/actions/workouts";
import { HomeClient } from "@/components/home-client";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profile, templates, weekStats, streak, leaderboardConsistency, leaderboardVolume, myRank] =
    await Promise.all([
      getProfile(user.id),
      getTemplatesForUser(user.id),
      getWeekStats(user.id),
      getStreak(user.id),
      getLeaderboard("7d"),
      import("@/lib/db/leaderboards").then((m) => m.getLeaderboardByVolume("7d")),
      getMyRank(user.id, "7d"),
    ]);

  const suggestedTemplate = templates[0] ?? null;

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
    />
  );
}
