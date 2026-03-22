"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  Flame,
  Dumbbell,
  Scale,
  Calendar,
  Activity,
  ArrowRight,
} from "lucide-react";
import type { WeekStats, TrainingDay } from "@/lib/db/analytics";
import type { Exercise, BodyMeasurement, BodyWeightEntry } from "@/lib/db/types";

const VolumeChart = dynamic(() => import("./charts/volume-chart").then((m) => m.VolumeChart), { ssr: false });
const WorkoutsChart = dynamic(() => import("./charts/workouts-chart").then((m) => m.WorkoutsChart), { ssr: false });
const ExerciseProgressionChart = dynamic(
  () => import("./charts/exercise-progression-chart").then((m) => m.ExerciseProgressionChart),
  { ssr: false }
);
const BodyweightChart = dynamic(() => import("./charts/bodyweight-chart").then((m) => m.BodyweightChart), { ssr: false });
const BodyWeightLogChart = dynamic(
  () => import("./charts/body-weight-log-chart").then((m) => m.BodyWeightLogChart),
  { ssr: false }
);

type ProgressClientProps = {
  weekStats: WeekStats;
  volumeByWeek: { weekStart: string; volume: number; workouts: number; sets: number }[];
  workoutsPerWeek: { weekStart: string; volume: number; workouts: number; sets: number }[];
  exercises: Exercise[];
  exerciseProgression: { date: string; weight: number; volume: number; reps: number }[];
  measurements: BodyMeasurement[];
  bodyWeights: BodyWeightEntry[];
  trainingDays30: TrainingDay[];
  streak: number;
};

const cardEnter = { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 } };

export function ProgressClient({
  weekStats,
  volumeByWeek,
  workoutsPerWeek,
  exercises,
  exerciseProgression: initialProgression,
  measurements,
  bodyWeights,
  trainingDays30,
  streak,
}: ProgressClientProps) {
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(exercises[0]?.id ?? null);
  const [exerciseProgression, setExerciseProgression] = useState(initialProgression);

  useEffect(() => {
    if (!selectedExerciseId) return;
    fetch(`/api/exercise-progression?exerciseId=${selectedExerciseId}&range=30d`)
      .then((r) => r.json())
      .then(setExerciseProgression)
      .catch(() => {});
  }, [selectedExerciseId]);

  const vol12 = useMemo(
    () => volumeByWeek.reduce((s, w) => s + w.volume, 0),
    [volumeByWeek]
  );
  const wo12 = useMemo(
    () => volumeByWeek.reduce((s, w) => s + w.workouts, 0),
    [volumeByWeek]
  );
  const avgVolWeek = volumeByWeek.length ? Math.round(vol12 / volumeByWeek.length) : 0;
  const activeDays = trainingDays30.filter((d) => d.trained).length;

  const showCharts = weekStats.hasEnoughData;

  return (
    <div className="px-4 py-6 space-y-6 max-w-mobile mx-auto w-full pb-28">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="text-center space-y-1"
      >
        <h1 className="text-2xl font-bold tracking-tight">Progress</h1>
        <p className="text-muted-foreground text-xs uppercase tracking-wider">Analytics & trends</p>
      </motion.div>

      <motion.div
        {...cardEnter}
        transition={{ type: "spring", stiffness: 340, damping: 26 }}
        className="glass-panel p-4"
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Stats grid</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: Flame, label: "Streak", value: streak, sub: "days" },
            { icon: Dumbbell, label: "Total sessions", value: weekStats.totalWorkouts, sub: "all time" },
            { icon: Activity, label: "Volume (12w)", value: `${Math.round(vol12)}`, sub: "kg" },
            { icon: Calendar, label: "Active (30d)", value: activeDays, sub: "days trained" },
            { icon: TrendingUp, label: "Avg vol / week", value: avgVolWeek, sub: "kg (12w)" },
            { icon: BarChart3, label: "Sessions (12w)", value: wo12, sub: "workouts" },
          ].map((cell, i) => (
            <motion.div
              key={cell.label}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04, type: "spring", stiffness: 400, damping: 22 }}
              whileTap={{ scale: 0.98 }}
              className="rounded-2xl border border-white/10 bg-background/25 px-3 py-3"
            >
              <cell.icon className="h-4 w-4 text-primary mb-1" />
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{cell.label}</p>
              <p className="text-lg font-bold tabular-nums">
                {cell.value}
                {typeof cell.value === "number" ? "" : ""}
              </p>
              <p className="text-[10px] text-muted-foreground">{cell.sub}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div {...cardEnter} transition={{ delay: 0.05 }} className="glass-panel p-4 space-y-2">
        <div className="flex justify-between items-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Consistency · 30 days</p>
          <Link href="/history" className="text-xs text-primary flex items-center gap-0.5">
            History <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-10 gap-1">
          {trainingDays30.map((d) => (
            <motion.div
              key={d.date}
              title={d.date}
              initial={false}
              animate={{ scale: d.trained ? 1 : 0.92 }}
              className={`aspect-square rounded-md border border-white/5 ${
                d.trained ? "bg-primary/85 shadow-[0_0_6px_hsl(var(--primary)/0.35)]" : "bg-muted/20"
              }`}
            />
          ))}
        </div>
      </motion.div>

      {!showCharts ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-8 text-center space-y-4">
          <div className="w-20 h-20 mx-auto flex items-center justify-center rounded-full border border-white/15 bg-background/30">
            <BarChart3 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="font-bold text-lg">Collecting data…</h2>
          <p className="text-sm text-muted-foreground">
            Log 5+ sessions or train 7+ days to unlock full charts.
          </p>
          <div className="grid grid-cols-1 gap-2 text-left text-sm rounded-2xl border border-white/10 bg-background/20 p-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">This week</span>
              <span className="font-bold text-primary">{weekStats.workoutsThisWeek}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Volume</span>
              <span className="font-bold text-primary">{Math.round(weekStats.volumeThisWeek)} kg</span>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-5">
          <motion.div {...cardEnter} transition={{ delay: 0.06 }} className="glass-panel p-5 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              This week
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-white/10 bg-background/25 p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase">Workouts</p>
                <p className="text-2xl font-bold text-primary">{weekStats.workoutsThisWeek}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-background/25 p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase">Volume</p>
                <p className="text-2xl font-bold text-primary">{Math.round(weekStats.volumeThisWeek)} kg</p>
              </div>
            </div>
          </motion.div>

          <motion.section {...cardEnter} transition={{ delay: 0.08 }} className="glass-panel p-4 space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">Volume per week</h2>
            <div className="rounded-2xl border border-white/5 bg-background/15 p-2 overflow-hidden">
              <VolumeChart data={volumeByWeek} />
            </div>
          </motion.section>

          <motion.section {...cardEnter} transition={{ delay: 0.1 }} className="glass-panel p-4 space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">Workouts per week</h2>
            <div className="rounded-2xl border border-white/5 bg-background/15 p-2 overflow-hidden">
              <WorkoutsChart data={workoutsPerWeek} />
            </div>
          </motion.section>

          {exercises.length > 0 && (
            <motion.section {...cardEnter} transition={{ delay: 0.12 }} className="glass-panel p-4 space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                Strength · weight &amp; 1RM trend
              </h2>
              <select
                className="w-full rounded-2xl border border-white/10 bg-background/30 px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/40 outline-none"
                value={selectedExerciseId ?? ""}
                onChange={(e) =>
                  setSelectedExerciseId(e.target.value ? parseInt(e.target.value, 10) : null)
                }
              >
                {exercises.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}
                  </option>
                ))}
              </select>
              <div className="rounded-2xl border border-white/5 bg-background/15 p-2 overflow-hidden">
                <ExerciseProgressionChart
                  data={exerciseProgression}
                  exerciseName={exercises.find((e) => e.id === selectedExerciseId)?.name ?? ""}
                />
              </div>
            </motion.section>
          )}

          <motion.section {...cardEnter} transition={{ delay: 0.14 }} className="glass-panel p-4 space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Scale className="h-4 w-4 text-primary" />
                Body weight log
              </h2>
              <Link href="/weight" className="text-xs text-primary">
                Log →
              </Link>
            </div>
            <div className="rounded-2xl border border-white/5 bg-background/15 p-2 overflow-hidden">
              <BodyWeightLogChart data={bodyWeights} />
            </div>
          </motion.section>

          {measurements.length > 0 && (
            <motion.section {...cardEnter} transition={{ delay: 0.16 }} className="glass-panel p-4 space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                Legacy measurements
              </h2>
              <div className="rounded-2xl border border-white/5 bg-background/15 p-2 overflow-hidden">
                <BodyweightChart data={measurements} />
              </div>
            </motion.section>
          )}
        </div>
      )}
    </div>
  );
}
