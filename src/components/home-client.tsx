"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Play, Flame, Dumbbell, TrendingUp, Trophy, Clock, X, Check } from "lucide-react";
import { SignOutButton } from "@/components/app-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Profile, WorkoutTemplate, LeaderboardRow, BodyWeightEntry } from "@/lib/db/types";
import type { WeekStats, TrainingDay } from "@/lib/db/analytics";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
  trainingDays30: TrainingDay[];
  volumeSparkline7: number[];
  bodyWeightTrend: BodyWeightEntry[];
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
  trainingDays30,
  volumeSparkline7,
  bodyWeightTrend,
}: HomeClientProps) {
  const [mode, setMode] = useState<"me" | "community">("me");
  const [confirmWorkout, setConfirmWorkout] = useState<{ templateId: string | null; name: string } | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const handleStartWorkout = async () => {
    if (!confirmWorkout) return;
    setIsStarting(true);
    try {
      await startWorkoutAction(confirmWorkout.templateId, confirmWorkout.name);
    } finally {
      setIsStarting(false);
      setConfirmWorkout(null);
    }
  };

  const volumeDiff =
    weekStats.volumeLastWeek > 0
      ? ((weekStats.volumeThisWeek - weekStats.volumeLastWeek) /
          weekStats.volumeLastWeek) *
        100
      : 0;
      
  const progressPercent = Math.min(100, Math.round((weekStats.workoutsThisWeek / 5) * 100));

  const volChart = volumeSparkline7.map((v, i) => ({ i: `D${i + 1}`, v }));
  const bwChart = bodyWeightTrend.map((e) => ({ d: e.date.slice(5), w: e.weight_kg }));

  return (
    <div className="px-4 py-6 space-y-8 max-w-mobile mx-auto w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">
          {profile?.display_name || profile?.username || "Gym Tracker"}
        </h1>
        <SignOutButton />
      </div>

      <div className="flex rounded-full glass-panel p-1 border-white/15">
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
            <div className="relative w-56 h-56 flex items-center justify-center rounded-full glass-panel">
              <div className="absolute inset-3 rounded-full bg-background/30 border border-white/10 flex flex-col items-center justify-center overflow-hidden">
                {suggestedTemplate ? (
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Up Next</p>
                ) : (
                  <>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Rest Day</p>
                    <p className="text-lg font-bold text-center px-4 leading-tight break-words">Recover</p>
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
            {suggestedTemplate && (
              <p className="text-center font-bold text-xl mt-4 px-4 w-full max-w-sm break-words pb-20">
                {suggestedTemplate.name}
              </p>
            )}
            <div className="absolute -bottom-6 z-10 flex flex-col items-center gap-6">
              <Button
                size="icon-lg"
                className="rounded-full h-[72px] w-[72px] shadow-[0_0_20px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_25px_hsl(var(--primary)/0.6)] animate-pulse-slow text-primary-foreground touch-manipulation active:scale-[0.98] transition-transform min-h-[72px] min-w-[72px]"
                onClick={() => setConfirmWorkout({ templateId: suggestedTemplate?.id ?? null, name: suggestedTemplate?.name ?? "Custom workout" })}
              >
                <Play className="h-8 w-8 ml-1" fill="currentColor" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full text-muted-foreground hover:text-foreground text-xs px-6 py-3 touch-manipulation active:scale-[0.98] transition-transform min-h-[40px]"
                onClick={() => setConfirmWorkout({ templateId: null, name: "Custom workout" })}
              >
                Start empty workout
              </Button>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="grid grid-cols-3 gap-3 px-1 pt-10"
          >
            {[
              { icon: Flame, val: streak, label: "Streak" },
              { icon: Dumbbell, val: weekStats.workoutsThisWeek, label: "This week" },
              {
                icon: TrendingUp,
                val: `${volumeDiff >= 0 ? "+" : ""}${volumeDiff.toFixed(0)}%`,
                label: "Vol vs last",
              },
            ].map((item) => (
              <div key={item.label} className="glass-panel py-4 px-2 flex flex-col items-center text-center">
                <item.icon className="h-5 w-5 text-primary mb-1" />
                <span className="text-lg font-bold tabular-nums">{item.val}</span>
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, type: "spring", stiffness: 300, damping: 26 }}
            className="glass-panel p-4 space-y-3"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">30-day consistency</h3>
              <span className="text-xs text-primary font-medium">
                {trainingDays30.filter((d) => d.trained).length} active days
              </span>
            </div>
            <div className="grid grid-cols-10 gap-1">
              {trainingDays30.map((d) => (
                <motion.div
                  key={d.date}
                  title={d.date}
                  initial={false}
                  animate={{ scale: d.trained ? 1 : 0.92 }}
                  className={`aspect-square rounded-md border border-white/5 ${
                    d.trained ? "bg-primary/85 shadow-[0_0_8px_hsl(var(--primary)/0.35)]" : "bg-muted/25"
                  }`}
                />
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, type: "spring", stiffness: 300, damping: 26 }}
            className="glass-panel p-4 h-44"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">7-day volume</p>
            {volChart.some((x) => x.v > 0) ? (
              <ResponsiveContainer width="100%" height="85%">
                <AreaChart data={volChart} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="homeVol" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="i" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} width={32} />
                  <Tooltip
                    formatter={(v: number) => [`${Math.round(v)} kg`, "Volume"]}
                    contentStyle={{
                      borderRadius: 12,
                      background: "hsl(var(--card) / 0.95)",
                      border: "1px solid hsl(var(--border))",
                    }}
                  />
                  <Area type="monotone" dataKey="v" stroke="hsl(var(--primary))" fill="url(#homeVol)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-10 text-center">Complete workouts to see volume.</p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 26 }}
            className="glass-panel p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Body weight</p>
              {bodyWeightTrend.length > 0 ? (
                <p className="text-lg font-bold mt-1">{bodyWeightTrend[bodyWeightTrend.length - 1]?.weight_kg} kg</p>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">No entries yet</p>
              )}
            </div>
            <div className="h-20 w-full sm:w-40 flex-shrink-0">
              {bwChart.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={bwChart} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
                    <defs>
                      <linearGradient id="homeBw" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="w" stroke="hsl(var(--primary))" fill="url(#homeBw)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : null}
            </div>
            <Button asChild variant="outline" className="rounded-full shrink-0 border-white/20">
              <Link href="/weight">Log weight</Link>
            </Button>
          </motion.div>

          <div className="space-y-4 pt-2 pb-10">
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
                   className="flex items-center justify-between gap-4 p-5 rounded-3xl glass-panel active:scale-[0.98] transition-all cursor-pointer group touch-manipulation min-h-[80px]"
                   onClick={() => setConfirmWorkout({ templateId: t.id, name: t.name })}
                 >
                    <div className="min-w-0 flex-1 py-1">
                      <p className="font-medium group-hover:text-primary transition-colors break-words text-base sm:text-lg leading-tight">{t.name}</p>
                      <p className="text-xs text-muted-foreground mt-1 break-words">{t.description || "Custom workout"}</p>
                    </div>
                    <div className="flex items-center justify-center h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-neu-inset bg-card group-hover:shadow-neu-extruded transition-all flex-shrink-0">
                      <Play className="h-5 w-5 sm:h-6 sm:w-6 text-primary group-hover:drop-shadow-[0_0_5px_hsl(var(--primary)/0.5)] ml-0.5" />
                    </div>
                 </motion.div>
               ))}
               {templates.length === 0 && (
                 <div className="p-6 rounded-3xl glass-panel text-center text-sm text-muted-foreground">
                   No routines yet. Create one or start an empty workout.
                 </div>
               )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8 pt-4 pb-10">
          {myRank && (
            <div className="p-6 rounded-3xl glass-panel text-center relative overflow-hidden">
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
            <div className="p-4 rounded-3xl glass-panel space-y-3">
              {leaderboardConsistency.slice(0, 5).map((row, i) => (
                <div
                  key={row.user_id}
                  className="flex justify-between items-center p-3 rounded-2xl bg-background/25 border border-white/5"
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
            <div className="p-4 rounded-3xl glass-panel space-y-3">
              {leaderboardVolume.slice(0, 5).map((row, i) => (
                <div
                  key={row.user_id}
                  className="flex justify-between items-center p-3 rounded-2xl bg-background/25 border border-white/5"
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

      {/* Start Workout Confirmation Dialog */}
      <Dialog open={!!confirmWorkout} onOpenChange={(o) => !o && setConfirmWorkout(null)}>
        <DialogContent className="rounded-3xl max-w-sm mx-auto glass-panel border-white/20">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">Ready to Workout?</DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground">
              Review today&apos;s workout before starting the timer
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="p-4 rounded-2xl bg-background/30 border border-white/10 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Workout</p>
              <p className="font-bold text-lg break-words">{confirmWorkout?.name}</p>
            </div>
            
            {confirmWorkout?.templateId && templates.find(t => t.id === confirmWorkout.templateId)?.scheduled_days && (
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>Scheduled workout</span>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 rounded-full h-12 touch-manipulation min-h-[48px]"
              onClick={() => setConfirmWorkout(null)}
              disabled={isStarting}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-full h-12 touch-manipulation min-h-[48px]"
              onClick={handleStartWorkout}
              disabled={isStarting}
            >
              {isStarting ? (
                <span className="animate-pulse">Starting...</span>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Confirm & Start
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
