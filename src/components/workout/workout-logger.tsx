"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Plus, Minus, Flag, Square, Trophy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RestTimer } from "./rest-timer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { saveSetAction } from "@/app/actions/sets";
import { endWorkoutFromForm, deleteWorkoutFromForm } from "@/app/actions/end-workout";
import type { WorkoutWithSets, TemplateWithExercises } from "@/lib/db/types";
import type { ExerciseHistoryEntry } from "@/lib/db/exercises";

type EndDialogStep = "choice" | "confirm-save" | "confirm-discard";

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
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [endDialogStep, setEndDialogStep] = useState<EndDialogStep>("choice");

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

  const openEndDialog = () => {
    setEndDialogStep("choice");
    setEndDialogOpen(true);
  };

  if (templateExercises.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 max-w-lg mx-auto">
        <div className="p-8 rounded-3xl bg-card shadow-neu-extruded text-center space-y-6">
          <p className="text-muted-foreground font-medium">No exercises in this workout.</p>
          <p className="text-sm text-muted-foreground">Add exercises from a template or end and start a new one.</p>
          <Button type="button" variant="default" className="rounded-full w-full" onClick={openEndDialog}>
            End Workout
          </Button>
        </div>
        <EndWorkoutDialog
          open={endDialogOpen}
          onOpenChange={setEndDialogOpen}
          step={endDialogStep}
          onStepChange={setEndDialogStep}
          workoutId={workout.id}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 flex flex-col items-center">
      {/* Top Header & Progress */}
      <div className="sticky top-0 z-10 w-full max-w-lg bg-background/80 backdrop-blur-md p-4">
        <div className="flex items-center justify-between p-4 rounded-3xl bg-card shadow-neu-extruded">
          <div>
            <h1 className="font-bold text-sm uppercase tracking-wider text-primary truncate max-w-[150px]">{workout.name}</h1>
            <p className="text-2xl font-bold tracking-tight mt-1">
              {formatElapsed(elapsed)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Simple circular progress indicator */}
            <div className="relative w-12 h-12 flex items-center justify-center rounded-full shadow-neu-inset bg-card">
              <span className="text-xs font-bold text-muted-foreground">{sets.length}</span>
              <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="3" className="text-border/30" />
                <circle 
                  cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="3"
                  className="text-primary drop-shadow-[0_0_5px_hsl(var(--primary)/0.5)]"
                  strokeDasharray="125.6"
                  strokeDashoffset={Math.max(0, 125.6 - (125.6 * (sets.length / Math.max(1, templateExercises.reduce((acc, te) => acc + te.target_sets, 0)))))}
                  style={{ transition: "stroke-dashoffset 0.5s ease" }}
                />
              </svg>
            </div>
            
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-12 w-12 rounded-full shadow-neu-extruded text-destructive hover:text-destructive active:shadow-neu-pressed"
              onClick={openEndDialog}
              aria-label="End or discard workout"
            >
              <Square className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="w-full max-w-lg p-4 space-y-6 flex-1 flex flex-col">
        {/* Exercise Nav Pills */}
        <div className="flex gap-3 overflow-x-auto pb-4 px-1 -mx-1 snap-x">
          {templateExercises.map((te, i) => {
            const completed = sets.filter((s) => s.exercise_id === te.exercise_id).length >= te.target_sets;
            const isActive = i === currentExerciseIndex;
            return (
              <button
                key={te.id}
                type="button"
                onClick={() => setCurrentExerciseIndex(i)}
                className={`snap-center flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-250 ${
                  isActive
                    ? "text-primary shadow-neu-pressed bg-background/50"
                    : completed
                    ? "text-muted-foreground shadow-neu-inset bg-card opacity-60"
                    : "text-foreground shadow-neu-extruded bg-card active:scale-95 active:shadow-neu-pressed"
                }`}
              >
                {te.exercise.name.slice(0, 15)}{te.exercise.name.length > 15 ? '...' : ''}
              </button>
            );
          })}
        </div>

        {currentExercise && (
          <div className="space-y-6 flex-1 flex flex-col">
            <div className="text-center space-y-1">
              <h2 className="font-bold text-2xl tracking-tight">{currentExercise.exercise.name}</h2>
              <p className="text-sm text-primary font-medium tracking-wide">
                TARGET: {currentExercise.target_sets} SETS
                {currentExercise.target_reps_min ? ` × ${currentExercise.target_reps_min}-${currentExercise.target_reps_max} REPS` : ""}
              </p>
              {history[0] && (
                <p className="text-xs text-muted-foreground uppercase tracking-wider mt-2">
                  Last Session: {history[0].sets.filter((s) => !s.is_warmup).map((s) => `${s.weight_kg}kg × ${s.reps}`).join(", ")}
                </p>
              )}
            </div>

            {/* Set History (Playlist Style) */}
            <div className="space-y-3 mt-4">
              <AnimatePresence initial={false}>
                {exerciseSets.map((s, i) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, height: 0, scale: 0.9 }}
                    animate={{ opacity: 1, height: "auto", scale: 1 }}
                    className="flex justify-between items-center p-4 rounded-2xl shadow-neu-inset bg-card"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-8 w-8 rounded-full shadow-neu-extruded flex items-center justify-center text-primary text-xs font-bold">
                        {i + 1}
                      </div>
                      <span className="font-bold text-lg">{s.weight_kg} kg <span className="text-muted-foreground text-sm font-normal mx-1">×</span> {s.reps}</span>
                    </div>
                    <Check className="h-5 w-5 text-primary drop-shadow-[0_0_5px_hsl(var(--primary)/0.5)]" />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Input Controls */}
            {nextSetIndex < targetSets && (
              <div className="p-6 rounded-3xl shadow-neu-extruded bg-card mt-auto space-y-8">
                <div className="flex items-center justify-between px-2">
                  <div className="flex flex-col items-center gap-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Weight (kg)</span>
                    <div className="flex items-center gap-4">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="rounded-full h-12 w-12 shadow-neu-extruded active:shadow-neu-pressed"
                        onClick={() => setWeight((w) => Math.max(0, w - 2.5))}
                      >
                        <Minus className="h-5 w-5" />
                      </Button>
                      <div className="w-16 h-16 flex items-center justify-center rounded-full shadow-neu-inset bg-card">
                        <span className="font-bold text-xl">{weight}</span>
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="rounded-full h-12 w-12 shadow-neu-extruded active:shadow-neu-pressed text-primary"
                        onClick={() => setWeight((w) => w + 2.5)}
                      >
                        <Plus className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>

                  <div className="w-px h-24 bg-border/50 shadow-neu-inset rounded-full mx-2" />

                  <div className="flex flex-col items-center gap-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Reps</span>
                    <div className="flex items-center gap-4">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="rounded-full h-12 w-12 shadow-neu-extruded active:shadow-neu-pressed"
                        onClick={() => setReps((r) => Math.max(1, r - 1))}
                      >
                        <Minus className="h-5 w-5" />
                      </Button>
                      <div className="w-16 h-16 flex items-center justify-center rounded-full shadow-neu-inset bg-card">
                        <span className="font-bold text-xl">{reps}</span>
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="rounded-full h-12 w-12 shadow-neu-extruded active:shadow-neu-pressed text-primary"
                        onClick={() => setReps((r) => r + 1)}
                      >
                        <Plus className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className={`rounded-full h-14 px-6 flex-shrink-0 transition-all duration-200 ${
                      isFailure 
                        ? "shadow-neu-pressed text-destructive bg-background/50" 
                        : "shadow-neu-extruded text-muted-foreground"
                    }`}
                    onClick={() => setIsFailure((f) => !f)}
                  >
                    <Flag className="h-4 w-4 mr-2" />
                    Failure
                  </Button>
                  
                  <Button
                    className="flex-1 rounded-full h-14 text-lg font-bold shadow-[0_0_15px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_20px_hsl(var(--primary)/0.5)] active:scale-[0.98] transition-all"
                    onClick={handleSaveSet}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Log Set"}
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
                  className="text-sm text-primary font-bold tracking-wide flex items-center justify-center gap-2 mt-4"
                >
                  <Trophy className="h-4 w-4" />
                  Personal Best!
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        )}

        <div className="flex gap-4 pt-4">
          <Button
            variant="ghost"
            className="flex-1 rounded-full h-12 shadow-neu-extruded active:shadow-neu-pressed disabled:opacity-30 disabled:shadow-neu-extruded"
            disabled={currentExerciseIndex === 0}
            onClick={() => setCurrentExerciseIndex((i) => Math.max(0, i - 1))}
          >
            Previous
          </Button>
          <Button
            variant="ghost"
            className="flex-1 rounded-full h-12 shadow-neu-extruded active:shadow-neu-pressed text-primary disabled:opacity-30 disabled:shadow-neu-extruded disabled:text-muted-foreground"
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

      <EndWorkoutDialog
        open={endDialogOpen}
        onOpenChange={setEndDialogOpen}
        step={endDialogStep}
        onStepChange={setEndDialogStep}
        workoutId={workout.id}
      />
    </div>
  );
}

function EndWorkoutDialog({
  open,
  onOpenChange,
  step,
  onStepChange,
  workoutId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  step: EndDialogStep;
  onStepChange: (s: EndDialogStep) => void;
  workoutId: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showClose={step === "choice"} className="rounded-3xl">
        {step === "choice" && (
          <>
            <DialogHeader>
              <DialogTitle>End workout?</DialogTitle>
              <DialogDescription>
                Save and finish this workout, or discard it and leave without saving.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="rounded-full"
                onClick={() => onStepChange("confirm-discard")}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Discard workout
              </Button>
              <Button
                className="rounded-full"
                onClick={() => onStepChange("confirm-save")}
              >
                Save & finish
              </Button>
            </DialogFooter>
          </>
        )}
        {step === "confirm-save" && (
          <>
            <DialogHeader>
              <DialogTitle>Save and finish?</DialogTitle>
              <DialogDescription>
                This will save your workout and show the summary. You can view it in your history later.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" className="rounded-full" onClick={() => onStepChange("choice")}>
                Back
              </Button>
              <form action={endWorkoutFromForm} className="inline">
                <input type="hidden" name="workoutId" value={workoutId} />
                <Button type="submit" className="rounded-full">
                  Save & finish
                </Button>
              </form>
            </DialogFooter>
          </>
        )}
        {step === "confirm-discard" && (
          <>
            <DialogHeader>
              <DialogTitle>Discard this workout?</DialogTitle>
              <DialogDescription>
                All logged sets will be lost. This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" className="rounded-full" onClick={() => onStepChange("choice")}>
                Back
              </Button>
              <form action={deleteWorkoutFromForm} className="inline">
                <input type="hidden" name="workoutId" value={workoutId} />
                <Button type="submit" variant="destructive" className="rounded-full">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Discard
                </Button>
              </form>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
