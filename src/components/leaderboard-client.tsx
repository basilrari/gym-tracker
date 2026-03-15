"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LeaderboardRow } from "@/lib/db/types";

type LeaderboardClientProps = {
  consistency7d: LeaderboardRow[];
  consistency30d: LeaderboardRow[];
  volume7d: LeaderboardRow[];
  volume30d: LeaderboardRow[];
  myRank7d: number | null;
  myRank30d: number | null;
  currentUserId: string;
};

export function LeaderboardClient({
  consistency7d,
  consistency30d,
  volume7d,
  volume30d,
  myRank7d,
  myRank30d,
  currentUserId,
}: LeaderboardClientProps) {
  const [period, setPeriod] = useState<"7d" | "30d">("7d");
  const [metric, setMetric] = useState<"consistency" | "volume">("consistency");

  const consistency = period === "7d" ? consistency7d : consistency30d;
  const volume = period === "7d" ? volume7d : volume30d;
  const myRank = metric === "consistency"
    ? period === "7d"
      ? myRank7d
      : myRank30d
    : null;

  const rows = metric === "consistency" ? consistency : volume;

  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto">
      <h1 className="text-xl font-bold">Leaderboard</h1>

      {myRank && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-primary/30">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Your rank</p>
              <p className="text-2xl font-bold text-primary">#{myRank}</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setPeriod("7d")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium ${
            period === "7d" ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}
        >
          7 days
        </button>
        <button
          type="button"
          onClick={() => setPeriod("30d")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium ${
            period === "30d" ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}
        >
          30 days
        </button>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMetric("consistency")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 ${
            metric === "consistency"
              ? "bg-primary text-primary-foreground"
              : "bg-muted"
          }`}
        >
          <Flame className="h-4 w-4" />
          Consistency
        </button>
        <button
          type="button"
          onClick={() => setMetric("volume")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 ${
            metric === "volume"
              ? "bg-primary text-primary-foreground"
              : "bg-muted"
          }`}
        >
          <Trophy className="h-4 w-4" />
          Volume
        </button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {metric === "consistency" ? "Workouts" : "Total volume"} ({period})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {rows.map((row) => (
              <div
                key={row.user_id}
                className={`flex justify-between items-center py-3 px-3 rounded-lg ${
                  row.user_id === currentUserId ? "bg-primary/20" : ""
                }`}
              >
                <span className="font-medium">
                  #{row.rank} {row.display_name || row.username}
                </span>
                <span className="text-muted-foreground">
                  {metric === "consistency"
                    ? `${row.workouts_count} workouts`
                    : `${Math.round(row.total_volume_kg)} kg`}
                </span>
              </div>
            ))}
            {rows.length === 0 && (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No data yet. Complete workouts to appear on the leaderboard.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
