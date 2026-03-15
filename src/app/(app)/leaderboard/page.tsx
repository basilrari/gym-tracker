import { createClient } from "@/lib/supabase/server";
import { getLeaderboard, getLeaderboardByVolume, getMyRank } from "@/lib/db/leaderboards";
import { LeaderboardClient } from "@/components/leaderboard-client";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [consistency7d, consistency30d, volume7d, volume30d, myRank7d, myRank30d] =
    await Promise.all([
      getLeaderboard("7d"),
      getLeaderboard("30d"),
      getLeaderboardByVolume("7d"),
      getLeaderboardByVolume("30d"),
      getMyRank(user.id, "7d"),
      getMyRank(user.id, "30d"),
    ]);

  return (
    <LeaderboardClient
      consistency7d={consistency7d}
      consistency30d={consistency30d}
      volume7d={volume7d}
      volume30d={volume30d}
      myRank7d={myRank7d}
      myRank30d={myRank30d}
      currentUserId={user.id}
    />
  );
}
