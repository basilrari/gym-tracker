"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WeekStats } from "@/lib/db/analytics";
import type { Exercise } from "@/lib/db/types";
import type { BodyMeasurement } from "@/lib/db/types";

const VolumeChart = dynamic(
  () => import("./charts/volume-chart").then((m) => m.VolumeChart),
  { ssr: false }
);
const WorkoutsChart = dynamic(
  () => import("./charts/workouts-chart").then((m) => m.WorkoutsChart),
  { ssr: false }
);
const ExerciseProgressionChart = dynamic(
  () =>
    import("./charts/exercise-progression-chart").then(
      (m) => m.ExerciseProgressionChart
    ),
  { ssr: false }
);
const BodyweightChart = dynamic(
  () => import("./charts/bodyweight-chart").then((m) => m.BodyweightChart),
  { ssr: false }
);

type ProgressClientProps = {
  weekStats: WeekStats;
  volumeByWeek: { weekStart: string; volume: number; workouts: number; sets: number }[];
  workoutsPerWeek: { weekStart: string; volume: number; workouts: number; sets: number }[];
  exercises: Exercise[];
  exerciseProgression: { date: string; weight: number; volume: number; reps: number }[];
  measurements: BodyMeasurement[];
};

export function ProgressClient({
  weekStats,
  volumeByWeek,
  workoutsPerWeek,
  exercises,
  exerciseProgression: initialProgression,
  measurements,
}: ProgressClientProps) {
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(
    exercises[0]?.id ?? null
  );
  const [exerciseProgression, setExerciseProgression] = useState(
    initialProgression
  );

  useEffect(() => {
    if (!selectedExerciseId) return;
    fetch(
      `/api/exercise-progression?exerciseId=${selectedExerciseId}&range=30d`
    )
      .then((r) => r.json())
      .then(setExerciseProgression)
      .catch(() => {});
  }, [selectedExerciseId]);

  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto pb-8">
      <div className="text-center space-y-1 mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Progress</h1>
        <p className="text-muted-foreground text-xs uppercase tracking-wider">Track your analytics</p>
      </div>

      {!weekStats.hasEnoughData ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="p-8 rounded-3xl bg-card shadow-neu-extruded text-center">
            <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center rounded-full shadow-neu-inset bg-card">
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="font-bold text-lg mb-2 text-foreground">
              Collecting data...
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Log at least 5 workouts or train for 7 days to unlock charts and analytics.
            </p>
            <div className="space-y-3 text-left bg-background/50 p-5 rounded-2xl shadow-neu-inset">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">This week</span>
                <span className="font-bold text-primary">{weekStats.workoutsThisWeek} workouts</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Volume</span>
                <span className="font-bold text-primary">{Math.round(weekStats.volumeThisWeek)} kg</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total logged</span>
                <span className="font-bold text-primary">{weekStats.totalWorkouts}</span>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              This week
            </h2>
            <div className="p-6 rounded-3xl bg-card shadow-neu-extruded space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl shadow-neu-inset bg-card">
                <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Workouts</span>
                <span className="font-bold text-xl text-primary">{weekStats.workoutsThisWeek}</span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-2xl shadow-neu-inset bg-card">
                <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Volume</span>
                <span className="font-bold text-xl text-primary">{Math.round(weekStats.volumeThisWeek)} kg</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2">Volume per week</h2>
            <div className="p-4 rounded-3xl bg-card shadow-neu-extruded">
              <div className="p-2 rounded-2xl shadow-neu-inset bg-background/50">
                <VolumeChart data={volumeByWeek} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2">Workouts per week</h2>
            <div className="p-4 rounded-3xl bg-card shadow-neu-extruded">
              <div className="p-2 rounded-2xl shadow-neu-inset bg-background/50">
                <WorkoutsChart data={workoutsPerWeek} />
              </div>
            </div>
          </div>

          {exercises.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2">Exercise progression</h2>
              <div className="p-5 rounded-3xl bg-card shadow-neu-extruded space-y-4">
                <select
                  className="w-full rounded-full border-none shadow-neu-inset bg-card px-5 py-3 text-sm font-medium focus:ring-2 focus:ring-primary appearance-none outline-none"
                  value={selectedExerciseId ?? ""}
                  onChange={(e) =>
                    setSelectedExerciseId(
                      e.target.value ? parseInt(e.target.value, 10) : null
                    )
                  }
                >
                  {exercises.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.name}
                    </option>
                  ))}
                </select>
                <div className="p-2 rounded-2xl shadow-neu-inset bg-background/50">
                  <ExerciseProgressionChart
                    data={exerciseProgression}
                    exerciseName={
                      exercises.find((e) => e.id === selectedExerciseId)?.name ??
                      ""
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {measurements.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2">Bodyweight</h2>
              <div className="p-4 rounded-3xl bg-card shadow-neu-extruded">
                <div className="p-2 rounded-2xl shadow-neu-inset bg-background/50">
                  <BodyweightChart data={measurements} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
