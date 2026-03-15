"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Plus, Minus, Flag, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RestTimer } from "./rest-timer";
import { saveSetAction } from "@/app/actions/sets";
import { endWorkoutAction } from "@/app/actions/end-workout";
import type { WorkoutWithSets, TemplateWithExercises } from "@/lib/db/types";
import type { ExerciseHistoryEntry } from "@/lib/db/exercises";

type WorkoutLoggerProps = {
  workout: WorkoutWithSets;
  templateExercises: TemplateWithExercises["exercises"];
  historyMap: Record<number, ExerciseHistoryEntry[]>;
  restTimerSeconds: number;
};

export function WorkoutLogger({
  workout,
  templateExercises,
  historyMap,
  restTimerSeconds,
}: WorkoutLoggerProps) {
  const [elapsed, setElapsed] = useState(0);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [sets, setSets] = useState(workout.sets);
  const [weight, setWeight] = useState(0);
  const [reps, setReps] = useState(8);
  const [isFailure, setIsFailure] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSavedSet, setLastSavedSet] = useState<{ exerciseId: number; weight: number } | null>(null);
  const [restTimerActive, setRestTimerActive] = useState(false);
  const [weightIncreased, setWeightIncreased] = useState(false);

  useEffect(() => {
    const start = new Date(workout.start_time).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [workout.start_time]);

  const currentExercise = templateExercises[currentExerciseIndex];
  const exerciseSets = sets.filter((s) => s.exercise_id === currentExercise?.exercise_id);
  const targetSets = currentExercise?.target_sets ?? 1;
  const nextSetIndex = exerciseSets.length;
  const history = currentExercise ? historyMap[currentExercise.exercise_id] ?? [] : [];
  const lastSessionBest = history[0]?.sets
    ?.filter((s) => !s.is_warmup)
    .reduce((max, s) => Math.max(max, s.weight_kg), 0) ?? 0;

  const handleSaveSet = useCallback(async () => {
    if (!currentExercise || saving) return;

    setSaving(true);
    try {
      await saveSetAction(
        workout.id,
        currentExercise.exercise_id,
        nextSetIndex,
        weight,
        reps,
        { isWarmup: currentExercise.is_warmup, isFailure }
      );

      setSets((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          workout_id: workout.id,
          exercise_id: currentExercise.exercise_id,
          set_index: nextSetIndex,
          weight_kg: weight,
          reps,
          rpe: null,
          rest_seconds: null,
          is_warmup: currentExercise.is_warmup,
          is_failure: isFailure,
          created_at: new Date().toISOString(),
        },
      ]);

      setLastSavedSet({ exerciseId: currentExercise.exercise_id, weight });
      setWeightIncreased(weight > lastSessionBest);
      setRestTimerActive(true);
    } finally {
      setSaving(false);
    }
  }, [
    currentExercise,
    workout.id,
    nextSetIndex,
    weight,
    reps,
    isFailure,
    saving,
    lastSessionBest,
  ]);

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (templateExercises.length === 0) {
    return (
      <div className="p-4">
        <p className="text-muted-foreground">No exercises in this workout.</p>
        <form action={() => endWorkoutAction(workout.id)}>
          <Button type="submit" variant="outline" className="mt-4">
            End Workout
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold">{workout.name}</h1>
            <p className="text-sm text-muted-foreground">
              {formatElapsed(elapsed)} elapsed
            </p>
          </div>
          <form action={() => endWorkoutAction(workout.id)}>
            <Button type="submit" variant="outline" size="sm">
              <Square className="h-4 w-4 mr-1" />
              End
            </Button>
          </form>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {templateExercises.map((te, i) => {
            const completed = sets.filter((s) => s.exercise_id === te.exercise_id).length >= te.target_sets;
            return (
              <button
                key={te.id}
                type="button"
                onClick={() => setCurrentExerciseIndex(i)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  i === currentExerciseIndex
                    ? "bg-primary text-primary-foreground"
                    : completed
                    ? "bg-muted text-muted-foreground"
                    : "bg-muted/50 hover:bg-muted"
                }`}
              >
                {te.exercise.name.slice(0, 12)}...
              </button>
            );
          })}
        </div>

        {currentExercise && (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <h2 className="font-bold text-lg">{currentExercise.exercise.name}</h2>
                <p className="text-sm text-muted-foreground">
                  Target: {currentExercise.target_sets} set(s) ×{" "}
                  {currentExercise.target_reps_min ?? "?"}–
                  {currentExercise.target_reps_max ?? "?"} reps
                  {currentExercise.is_warmup && " (warmup)"}
                </p>
                {history[0] && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Last: {history[0].sets.filter((s) => !s.is_warmup).map((s) => `${s.weight_kg}kg × ${s.reps}`).join(", ")}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {exerciseSets.map((s, i) => (
                  <motion.div
                    key={s.id}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/20 text-primary"
                  >
                    <Check className="h-3 w-3" />
                    <span className="text-sm font-medium">
                      {s.weight_kg}kg × {s.reps}
                    </span>
                  </motion.div>
                ))}
              </div>

              {nextSetIndex < targetSets && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => setWeight((w) => Math.max(0, w - 2.5))}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="min-w-[4rem] text-center font-bold text-xl">
                        {weight} kg
                      </span>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => setWeight((w) => w + 2.5)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => setReps((r) => Math.max(1, r - 1))}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="min-w-[2rem] text-center font-bold">
                        {reps} reps
                      </span>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => setReps((r) => r + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={isFailure ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIsFailure((f) => !f)}
                    >
                      <Flag className="h-4 w-4 mr-1" />
                      Failure
                    </Button>
                    <Button
                      className="flex-1"
                      size="lg"
                      onClick={handleSaveSet}
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Save set"}
                    </Button>
                  </div>
                </div>
              )}

              <AnimatePresence>
                {weightIncreased && lastSavedSet?.exerciseId === currentExercise.exercise_id && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-sm text-primary font-medium flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Weight increased!
                  </motion.p>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={currentExerciseIndex === 0}
            onClick={() => setCurrentExerciseIndex((i) => Math.max(0, i - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={currentExerciseIndex >= templateExercises.length - 1}
            onClick={() =>
              setCurrentExerciseIndex((i) =>
                Math.min(templateExercises.length - 1, i + 1)
              )
            }
          >
            Next
          </Button>
        </div>
      </div>

      <RestTimer
        seconds={restTimerSeconds}
        active={restTimerActive}
        onComplete={() => setRestTimerActive(false)}
        onSkip={() => setRestTimerActive(false)}
      />
    </div>
  );
}
