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
    <div className="p-4 space-y-6 max-w-lg mx-auto">
      <h1 className="text-xl font-bold">Progress</h1>

      {!weekStats.hasEnoughData ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardContent className="p-6 text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h2 className="font-semibold mb-2">
                Collecting data this week…
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Log at least 5 workouts or train for 7 days to unlock charts and
                analytics.
              </p>
              <div className="space-y-2 text-left">
                <p className="text-sm">
                  <span className="font-medium">Workouts this week:</span>{" "}
                  {weekStats.workoutsThisWeek}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Volume this week:</span>{" "}
                  {Math.round(weekStats.volumeThisWeek)} kg
                </p>
                <p className="text-sm">
                  <span className="font-medium">Total workouts:</span>{" "}
                  {weekStats.totalWorkouts}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                This week
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Workouts</span>
                <span className="font-bold">{weekStats.workoutsThisWeek}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Volume</span>
                <span className="font-bold">
                  {Math.round(weekStats.volumeThisWeek)} kg
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Volume per week</CardTitle>
            </CardHeader>
            <CardContent>
              <VolumeChart data={volumeByWeek} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Workouts per week</CardTitle>
            </CardHeader>
            <CardContent>
              <WorkoutsChart data={workoutsPerWeek} />
            </CardContent>
          </Card>

          {exercises.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Exercise progression</CardTitle>
                <select
                  className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
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
              </CardHeader>
              <CardContent>
                <ExerciseProgressionChart
                  data={exerciseProgression}
                  exerciseName={
                    exercises.find((e) => e.id === selectedExerciseId)?.name ??
                    ""
                  }
                />
              </CardContent>
            </Card>
          )}

          {measurements.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Bodyweight</CardTitle>
              </CardHeader>
              <CardContent>
                <BodyweightChart data={measurements} />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
