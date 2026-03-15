"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Plus, Minus, Flag, Square, Trophy, Trash2, Pencil } from "lucide-react";
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
import { saveSetAction, updateSetAction, deleteSetAction } from "@/app/actions/sets";
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
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editSetWeight, setEditSetWeight] = useState(0);
  const [editSetReps, setEditSetReps] = useState(1);
  const [editSetIsFailure, setEditSetIsFailure] = useState(false);

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

  const startEditingSet = (set: typeof exerciseSets[0]) => {
    setEditingSetId(set.id);
    setEditSetWeight(set.weight_kg);
    setEditSetReps(set.reps);
    setEditSetIsFailure(set.is_failure);
  };

  const handleUpdateSet = async () => {
    if (!editingSetId) return;
    
    try {
      await updateSetAction(editingSetId, {
        weight_kg: editSetWeight,
        reps: editSetReps,
        is_failure: editSetIsFailure,
      });
      
      setSets((prev) =>
        prev.map((s) =>
          s.id === editingSetId
            ? { ...s, weight_kg: editSetWeight, reps: editSetReps, is_failure: editSetIsFailure }
            : s
        )
      );
      setEditingSetId(null);
    } catch (error) {
      // Error handling removed - debug logging only
    }
  };

  const handleDeleteSet = async (setId: string) => {
    if (!confirm("Delete this set?")) return;
    
    try {
      await deleteSetAction(setId);
      setSets((prev) => prev.filter((s) => s.id !== setId));
    } catch (error) {
      // Error handling removed - debug logging only
    }
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
            <h1 className="font-bold text-sm uppercase tracking-wider text-primary break-words max-w-[180px] sm:max-w-[220px]">{workout.name}</h1>
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
              className="h-14 w-14 rounded-full shadow-neu-extruded text-destructive hover:text-destructive active:shadow-neu-pressed touch-manipulation min-h-[56px] min-w-[56px]"
              onClick={openEndDialog}
              aria-label="End or discard workout"
            >
              <Square className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>

      <div className="w-full max-w-lg p-4 space-y-6 flex-1 flex flex-col">
        {/* Exercise list – vertical stack with custom scrollbar */}
        <div className="relative flex flex-col gap-2 max-h-[220px] overflow-y-auto scrollbar-neu rounded-2xl pr-1">
          {/* Scroll hint gradient */}
          <div className="absolute top-0 left-0 right-1 h-6 bg-gradient-to-b from-background to-transparent pointer-events-none z-10 rounded-t-2xl" />
          <div className="absolute bottom-0 left-0 right-1 h-8 bg-gradient-to-t from-background to-transparent pointer-events-none z-10 rounded-b-2xl" />
          {templateExercises.map((te, i) => {
            const completed = sets.filter((s) => s.exercise_id === te.exercise_id).length >= te.target_sets;
            const isActive = i === currentExerciseIndex;
            return (
              <button
                key={te.id}
                type="button"
                onClick={() => setCurrentExerciseIndex(i)}
                className={`w-full text-left px-4 py-3 sm:py-4 rounded-2xl text-sm sm:text-base font-bold transition-all duration-250 break-words touch-manipulation min-h-[48px] ${
                  isActive
                    ? "text-primary shadow-neu-pressed bg-background/50"
                    : completed
                    ? "text-muted-foreground shadow-neu-inset bg-card opacity-60"
                    : "text-foreground shadow-neu-extruded bg-card active:scale-[0.99] active:shadow-neu-pressed"
                }`}
              >
                {te.exercise.name}
              </button>
            );
          })}
        </div>

        {currentExercise && (
          <div className="space-y-6 flex-1 flex flex-col">
            <div className="text-center space-y-1">
              <h2 className="font-bold text-2xl tracking-tight break-words">{currentExercise.exercise.name}</h2>
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
            <div className="relative max-h-[240px] overflow-y-auto scrollbar-neu pr-1 -mr-1">
              <div className="space-y-3 mt-4 pb-4">
                <AnimatePresence initial={false}>
                  {exerciseSets.map((s, i) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, height: 0, scale: 0.9 }}
                    animate={{ opacity: 1, height: "auto", scale: 1 }}
                    className="flex justify-between items-center gap-3 p-4 rounded-2xl shadow-neu-inset bg-card min-h-[72px]"
                  >
                    {editingSetId === s.id ? (
                      <div className="flex-1 flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-1 min-w-[120px]">
                          <input
                            type="number"
                            min={0}
                            step={0.5}
                            value={editSetWeight}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "") {
                                setEditSetWeight(0);
                              } else {
                                const num = parseFloat(val);
                                setEditSetWeight(Number.isNaN(num) ? 0 : Math.max(0, num));
                              }
                            }}
                            className="w-16 h-10 rounded-lg shadow-neu-inset bg-card border-0 text-center text-sm font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[40px] touch-manipulation"
                            aria-label="Edit weight"
                          />
                          <span className="text-sm text-muted-foreground">kg</span>
                          <span className="text-muted-foreground mx-1">×</span>
                          <input
                            type="number"
                            min={1}
                            value={editSetReps}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "") {
                                setEditSetReps(0);
                              } else {
                                const num = parseInt(val, 10);
                                setEditSetReps(Number.isNaN(num) ? 0 : Math.max(0, num));
                              }
                            }}
                            onBlur={() => setEditSetReps((r) => Math.max(1, r || 1))}
                            className="w-14 h-10 rounded-lg shadow-neu-inset bg-card border-0 text-center text-sm font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[40px] touch-manipulation"
                            aria-label="Edit reps"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className={`h-10 w-10 rounded-full touch-manipulation min-h-[40px] min-w-[40px] ${editSetIsFailure ? "text-destructive shadow-neu-pressed bg-background/50" : "text-muted-foreground"}`}
                            onClick={() => setEditSetIsFailure((f) => !f)}
                            aria-label="Toggle failure"
                          >
                            <Flag className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-10 w-10 rounded-full text-primary touch-manipulation min-h-[40px] min-w-[40px]"
                            onClick={handleUpdateSet}
                            aria-label="Save changes"
                          >
                            <Check className="h-5 w-5" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground touch-manipulation min-h-[40px] min-w-[40px]"
                            onClick={() => setEditingSetId(null)}
                            aria-label="Cancel editing"
                          >
                            <Minus className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="h-9 w-9 rounded-full shadow-neu-extruded flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                            {i + 1}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-base sm:text-lg truncate">
                              {s.weight_kg} kg <span className="text-muted-foreground font-normal mx-1">×</span> {s.reps}
                            </span>
                            {s.is_failure && (
                              <span className="text-[10px] text-destructive font-medium uppercase tracking-wider">Failure</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground touch-manipulation min-h-[40px] min-w-[40px] opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                            onClick={() => startEditingSet(s)}
                            aria-label="Edit set"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-10 w-10 rounded-full text-muted-foreground hover:text-destructive touch-manipulation min-h-[40px] min-w-[40px] opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDeleteSet(s.id)}
                            aria-label="Delete set"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Check className="h-5 w-5 text-primary drop-shadow-[0_0_5px_hsl(var(--primary)/0.5)] flex-shrink-0 ml-1" />
                        </div>
                      </>
                    )}
                  </motion.div>
                ))}
                </AnimatePresence>
              </div>
              {/* Scroll hint gradient at bottom */}
              {exerciseSets.length > 3 && (
                <div className="absolute bottom-0 left-0 right-1 h-8 bg-gradient-to-t from-background to-transparent pointer-events-none z-10 rounded-b-xl" />
              )}
            </div>

            {/* Input Controls – weight and reps with manual entry + steppers */}
            {nextSetIndex < targetSets && (
              <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.3)] bg-card z-50 space-y-4 sm:space-y-6 max-w-lg mx-auto border-t border-border/50">
                <div className="flex items-center justify-between px-1 sm:px-2 gap-2">
                  <div className="flex flex-col items-center gap-2 sm:gap-3 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Weight (kg)</span>
                    <div className="flex items-center gap-2 sm:gap-4">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="rounded-full h-12 w-12 sm:h-14 sm:w-14 shadow-neu-extruded active:shadow-neu-pressed touch-manipulation min-h-[48px] min-w-[48px]"
                        onClick={() => setWeight((w) => Math.max(0, w - 2.5))}
                      >
                        <Minus className="h-5 w-5 sm:h-6 sm:w-6" />
                      </Button>
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={weight}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "") {
                            setWeight(0);
                          } else {
                            const num = parseFloat(val);
                            setWeight(Number.isNaN(num) ? 0 : Math.max(0, num));
                          }
                        }}
                        onBlur={() => setWeight((w) => Math.max(0, w || 0))}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-full shadow-neu-inset bg-card border-0 text-center text-xl sm:text-2xl font-bold text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50 touch-manipulation min-h-[64px] min-w-[64px]"
                        aria-label="Weight in kg"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="rounded-full h-12 w-12 sm:h-14 sm:w-14 shadow-neu-extruded active:shadow-neu-pressed text-primary touch-manipulation min-h-[48px] min-w-[48px]"
                        onClick={() => setWeight((w) => w + 2.5)}
                      >
                        <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
                      </Button>
                    </div>
                  </div>

                  <div className="w-px h-20 sm:h-24 bg-border/50 shadow-neu-inset rounded-full mx-1 sm:mx-2" />

                  <div className="flex flex-col items-center gap-2 sm:gap-3 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Reps</span>
                    <div className="flex items-center gap-2 sm:gap-4">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="rounded-full h-12 w-12 sm:h-14 sm:w-14 shadow-neu-extruded active:shadow-neu-pressed touch-manipulation min-h-[48px] min-w-[48px]"
                        onClick={() => setReps((r) => Math.max(1, r - 1))}
                      >
                        <Minus className="h-5 w-5 sm:h-6 sm:w-6" />
                      </Button>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={reps}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "") {
                            setReps(0);
                          } else {
                            const num = parseInt(val, 10);
                            setReps(Number.isNaN(num) ? 0 : Math.max(0, num));
                          }
                        }}
                        onBlur={() => setReps((r) => Math.max(1, r || 1))}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-full shadow-neu-inset bg-card border-0 text-center text-xl sm:text-2xl font-bold text-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50 touch-manipulation min-h-[64px] min-w-[64px]"
                        aria-label="Reps"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="rounded-full h-12 w-12 sm:h-14 sm:w-14 shadow-neu-extruded active:shadow-neu-pressed text-primary touch-manipulation min-h-[48px] min-w-[48px]"
                        onClick={() => setReps((r) => r + 1)}
                      >
                        <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-4 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className={`rounded-full h-14 px-4 sm:px-6 flex-shrink-0 transition-all duration-200 touch-manipulation min-h-[56px] ${
                      isFailure 
                        ? "shadow-neu-pressed text-destructive bg-background/50" 
                        : "shadow-neu-extruded text-muted-foreground"
                    }`}
                    onClick={() => setIsFailure((f) => !f)}
                  >
                    <Flag className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="text-sm sm:text-base">Failure</span>
                  </Button>
                  
                  <Button
                    className="flex-1 rounded-full h-14 text-base sm:text-lg font-bold shadow-[0_0_15px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_20px_hsl(var(--primary)/0.5)] active:scale-[0.98] transition-all touch-manipulation min-h-[56px]"
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

        <div className="flex gap-3 sm:gap-4 pt-4">
          <Button
            variant="ghost"
            className="flex-1 rounded-full h-12 sm:h-14 shadow-neu-extruded active:shadow-neu-pressed disabled:opacity-30 disabled:shadow-neu-extruded touch-manipulation min-h-[48px] text-sm sm:text-base"
            disabled={currentExerciseIndex === 0}
            onClick={() => setCurrentExerciseIndex((i) => Math.max(0, i - 1))}
          >
            Previous
          </Button>
          <Button
            variant="ghost"
            className="flex-1 rounded-full h-12 sm:h-14 shadow-neu-extruded active:shadow-neu-pressed text-primary disabled:opacity-30 disabled:shadow-neu-extruded disabled:text-muted-foreground touch-manipulation min-h-[48px] text-sm sm:text-base"
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
            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
              <Button variant="outline" className="rounded-full h-12 flex-1 touch-manipulation min-h-[48px]" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="rounded-full h-12 flex-1 touch-manipulation min-h-[48px]"
                onClick={() => onStepChange("confirm-discard")}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Discard
              </Button>
              <Button
                className="rounded-full h-12 flex-1 touch-manipulation min-h-[48px]"
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
            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
              <Button variant="outline" className="rounded-full h-12 flex-1 touch-manipulation min-h-[48px]" onClick={() => onStepChange("choice")}>
                Back
              </Button>
              <form action={endWorkoutFromForm} className="inline flex-1">
                <input type="hidden" name="workoutId" value={workoutId} />
                <Button type="submit" className="rounded-full h-12 w-full touch-manipulation min-h-[48px]">
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
            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
              <Button variant="outline" className="rounded-full h-12 flex-1 touch-manipulation min-h-[48px]" onClick={() => onStepChange("choice")}>
                Back
              </Button>
              <form action={deleteWorkoutFromForm} className="inline flex-1">
                <input type="hidden" name="workoutId" value={workoutId} />
                <Button type="submit" variant="destructive" className="rounded-full h-12 w-full touch-manipulation min-h-[48px]">
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
