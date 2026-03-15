"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Play, Flame, Dumbbell, TrendingUp, Trophy } from "lucide-react";
import { SignOutButton } from "@/components/app-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Profile, WorkoutTemplate, LeaderboardRow } from "@/lib/db/types";
import type { WeekStats } from "@/lib/db/analytics";
import Link from "next/link";

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
      
  const progressPercent = Math.min(100, Math.round((weekStats.workoutsThisWeek / 5) * 100));

  return (
    <div className="px-6 py-6 space-y-10 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">
          {profile?.display_name || profile?.username || "Gym Tracker"}
        </h1>
        <SignOutButton />
      </div>

      <div className="flex rounded-full shadow-neu-inset bg-card p-1">
        <button
          type="button"
          onClick={() => setMode("me")}
          className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all duration-250 ${
            mode === "me"
              ? "bg-primary text-primary-foreground shadow-neu-extruded"
              : "text-muted-foreground hover:text-foreground active:scale-95"
          }`}
        >
          Me
        </button>
        <button
          type="button"
          onClick={() => setMode("community")}
          className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all duration-250 ${
            mode === "community"
              ? "bg-primary text-primary-foreground shadow-neu-extruded"
              : "text-muted-foreground hover:text-foreground active:scale-95"
          }`}
        >
          Community
        </button>
      </div>

      {mode === "me" ? (
        <div className="space-y-10">
          <div className="flex flex-col items-center justify-center relative py-8">
            <div className="relative w-56 h-56 flex items-center justify-center rounded-full shadow-neu-extruded bg-card">
              <div className="absolute inset-3 rounded-full shadow-neu-inset bg-card flex flex-col items-center justify-center">
                {suggestedTemplate ? (
                  <>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Up Next</p>
                    <p className="text-xl font-bold text-center px-6 leading-tight">{suggestedTemplate.name}</p>
                  </>
                ) : (
                  <>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Rest Day</p>
                    <p className="text-xl font-bold text-center px-6 leading-tight">Recover</p>
                  </>
                )}
              </div>
              <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)]">
                <circle cx="112" cy="112" r="102" fill="none" stroke="currentColor" strokeWidth="6" className="text-border/30" />
                <motion.circle 
                  cx="112" cy="112" r="102" fill="none" stroke="currentColor" strokeWidth="6"
                  className="text-primary"
                  strokeDasharray="640.88"
                  initial={{ strokeDashoffset: 640.88 }}
                  animate={{ strokeDashoffset: 640.88 - (640.88 * progressPercent) / 100 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
              </svg>
            </div>
            
            <div className="absolute -bottom-6 z-10 flex flex-col items-center gap-6">
              <Button
                size="icon-lg"
                className="rounded-full h-[72px] w-[72px] shadow-[0_0_20px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_25px_hsl(var(--primary)/0.6)] animate-pulse-slow text-primary-foreground"
                onClick={() => startWorkoutAction(suggestedTemplate?.id, suggestedTemplate?.name)}
              >
                <Play className="h-8 w-8 ml-1" fill="currentColor" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full text-muted-foreground hover:text-foreground text-xs px-6 py-3"
                onClick={() => startWorkoutAction(null, "Custom workout")}
              >
                Start empty workout
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 px-2 pt-10">
            <div className="flex flex-col items-center">
              <Flame className="h-5 w-5 text-primary mb-1 drop-shadow-[0_0_5px_hsl(var(--primary)/0.5)]" />
              <span className="text-xl font-bold">{streak}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Streak</span>
            </div>
            <div className="flex flex-col items-center">
              <Dumbbell className="h-5 w-5 text-primary mb-1 drop-shadow-[0_0_5px_hsl(var(--primary)/0.5)]" />
              <span className="text-xl font-bold">{weekStats.workoutsThisWeek}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Workouts</span>
            </div>
            <div className="flex flex-col items-center">
              <TrendingUp className="h-5 w-5 text-primary mb-1 drop-shadow-[0_0_5px_hsl(var(--primary)/0.5)]" />
              <span className="text-xl font-bold">{volumeDiff >= 0 ? "+" : ""}{volumeDiff.toFixed(0)}%</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Volume</span>
            </div>
          </div>

          <div className="space-y-4 pt-6 pb-10">
            <div className="flex justify-between items-end px-2">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Your Routines</h2>
              <Link href="/templates" className="text-xs text-primary hover:underline font-medium">View All</Link>
            </div>
            <div className="space-y-3">
               {templates.slice(0, 3).map((t, i) => (
                 <motion.div
                   key={t.id}
                   initial={{ opacity: 0, x: -10 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ delay: i * 0.1 }}
                   className="flex items-center justify-between gap-4 p-5 rounded-3xl bg-card shadow-neu-extruded active:shadow-neu-pressed active:scale-[0.98] transition-all cursor-pointer group"
                   onClick={() => startWorkoutAction(t.id, t.name)}
                 >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium group-hover:text-primary transition-colors break-words">{t.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 break-words">{t.description || "Custom workout"}</p>
                    </div>
                    <div className="flex items-center justify-center h-10 w-10 rounded-full shadow-neu-inset bg-card group-hover:shadow-neu-extruded transition-all">
                      <Play className="h-4 w-4 text-primary group-hover:drop-shadow-[0_0_5px_hsl(var(--primary)/0.5)] ml-0.5" />
                    </div>
                 </motion.div>
               ))}
               {templates.length === 0 && (
                 <div className="p-6 rounded-3xl shadow-neu-inset text-center text-sm text-muted-foreground">
                   No routines yet. Create one or start an empty workout.
                 </div>
               )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8 pt-4 pb-10">
          {myRank && (
            <div className="p-6 rounded-3xl bg-card shadow-neu-inset text-center relative overflow-hidden">
              <div className="absolute inset-0 border border-primary/20 rounded-3xl" />
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Your Rank (7d)</p>
              <p className="text-4xl font-bold text-primary text-glow flex items-center justify-center gap-2">
                <Trophy className="h-8 w-8" />
                #{myRank}
              </p>
            </div>
          )}
          
          <div className="space-y-2">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2">Consistency (7d)</h2>
            <div className="p-4 rounded-3xl bg-card shadow-neu-extruded space-y-3">
              {leaderboardConsistency.slice(0, 5).map((row, i) => (
                <div
                  key={row.user_id}
                  className="flex justify-between items-center p-3 rounded-2xl shadow-neu-inset"
                >
                  <span className="font-medium text-sm flex items-center gap-2">
                    <span className="text-primary font-bold w-4">{row.rank}</span>
                    {row.display_name || row.username}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {row.workouts_count} workouts
                  </span>
                </div>
              ))}
              {leaderboardConsistency.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">No data yet</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2">Volume (7d)</h2>
            <div className="p-4 rounded-3xl bg-card shadow-neu-extruded space-y-3">
              {leaderboardVolume.slice(0, 5).map((row, i) => (
                <div
                  key={row.user_id}
                  className="flex justify-between items-center p-3 rounded-2xl shadow-neu-inset"
                >
                  <span className="font-medium text-sm flex items-center gap-2">
                    <span className="text-primary font-bold w-4">{row.rank}</span>
                    {row.display_name || row.username}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(row.total_volume_kg)} kg
                  </span>
                </div>
              ))}
              {leaderboardVolume.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">No data yet</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
