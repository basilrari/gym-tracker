"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Play, Flame, Dumbbell, TrendingUp } from "lucide-react";
import { SignOutButton } from "@/components/app-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Profile, WorkoutTemplate, LeaderboardRow } from "@/lib/db/types";
import type { WeekStats } from "@/lib/db/analytics";

type HomeClientProps = {
  profile: Profile | null;
  templates: WorkoutTemplate[];
  weekStats: WeekStats;
  streak: number;
  leaderboardConsistency: LeaderboardRow[];
  leaderboardVolume: LeaderboardRow[];
  myRank: number | null;
  suggestedTemplate: WorkoutTemplate | null;
  startWorkoutAction: (
    templateId?: string | null,
    name?: string
  ) => Promise<void>;
};

export function HomeClient({
  profile,
  templates,
  weekStats,
  streak,
  leaderboardConsistency,
  leaderboardVolume,
  myRank,
  suggestedTemplate,
  startWorkoutAction,
}: HomeClientProps) {
  const [mode, setMode] = useState<"me" | "community">("me");

  const volumeDiff =
    weekStats.volumeLastWeek > 0
      ? ((weekStats.volumeThisWeek - weekStats.volumeLastWeek) /
          weekStats.volumeLastWeek) *
        100
      : 0;

  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">
          {profile?.display_name || profile?.username || "Gym Tracker"}
        </h1>
        <SignOutButton />
      </div>

      <div className="flex rounded-lg border border-border bg-muted/50 p-1">
        <button
          type="button"
          onClick={() => setMode("me")}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            mode === "me"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Me
        </button>
        <button
          type="button"
          onClick={() => setMode("community")}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            mode === "community"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Community
        </button>
      </div>

      {mode === "me" ? (
        <>
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">
              Suggested
            </h2>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              {suggestedTemplate && (
                <Card
                  className="cursor-pointer border-primary/30 hover:border-primary/50 transition-colors"
                  onClick={() =>
                    startWorkoutAction(suggestedTemplate.id, suggestedTemplate.name)
                  }
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{suggestedTemplate.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Tap to start
                      </p>
                    </div>
                    <Play className="h-6 w-6 text-primary" />
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-4 flex flex-col items-center gap-1">
                <Flame className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{streak}</span>
                <span className="text-xs text-muted-foreground">Streak</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex flex-col items-center gap-1">
                <Dumbbell className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">
                  {weekStats.workoutsThisWeek}
                </span>
                <span className="text-xs text-muted-foreground">This week</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex flex-col items-center gap-1">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">
                  {volumeDiff >= 0 ? "+" : ""}
                  {volumeDiff.toFixed(0)}%
                </span>
                <span className="text-xs text-muted-foreground">vs last week</span>
              </CardContent>
            </Card>
          </div>

          <div className="pt-4">
            <Button
              size="xl"
              className="w-full h-14 text-lg"
              onClick={() => startWorkoutAction()}
            >
              <Play className="h-6 w-6 mr-2" />
              Start Workout
            </Button>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          {myRank && (
            <Card className="border-primary/30">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Your rank (7d)</p>
                <p className="text-2xl font-bold text-primary">#{myRank}</p>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Consistency (7d)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {leaderboardConsistency.slice(0, 10).map((row) => (
                  <div
                    key={row.user_id}
                    className="flex justify-between items-center py-2 border-b border-border last:border-0"
                  >
                    <span className="font-medium">
                      #{row.rank} {row.display_name || row.username}
                    </span>
                    <span className="text-muted-foreground">
                      {row.workouts_count} workouts
                    </span>
                  </div>
                ))}
                {leaderboardConsistency.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4">
                    No data yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Volume (7d)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {leaderboardVolume.slice(0, 10).map((row) => (
                  <div
                    key={row.user_id}
                    className="flex justify-between items-center py-2 border-b border-border last:border-0"
                  >
                    <span className="font-medium">
                      #{row.rank} {row.display_name || row.username}
                    </span>
                    <span className="text-muted-foreground">
                      {Math.round(row.total_volume_kg)} kg
                    </span>
                  </div>
                ))}
                {leaderboardVolume.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4">
                    No data yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
