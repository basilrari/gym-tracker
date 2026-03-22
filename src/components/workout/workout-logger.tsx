"use client";

import { useState, useEffect, useCallback, useMemo, useRef, type Dispatch, type SetStateAction } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Plus,
  Minus,
  Flag,
  Square,
  Trophy,
  Trash2,
  Pencil,
  GripVertical,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
import {
  reorderExerciseLogsAction,
  reorderSessionSetsAction,
  getWorkoutSetsSnapshotAction,
} from "@/app/actions/workout-session";
import { endWorkoutFromForm, deleteWorkoutFromForm } from "@/app/actions/end-workout";
import { createClient } from "@/lib/supabase/client";
import type { WorkoutWithSets, TemplateWithExercises, WorkoutSet } from "@/lib/db/types";
import type { ExerciseHistoryEntry } from "@/lib/db/exercises";

const TAG_CHIPS = ["pr", "drop-set", "light", "hard"] as const;

type EndDialogStep = "choice" | "confirm-save" | "confirm-discard";

type Slot = { key: string; exerciseId: number; logId?: string };

function buildSlots(
  workout: WorkoutWithSets,
  templateExercises: TemplateWithExercises["exercises"]
): Slot[] {
  const order = workout.sessionExerciseLogOrder;
  if (order && order.length > 0) {
    return order.map((e) => ({
      key: e.logId,
      exerciseId: e.exerciseId,
      logId: e.logId,
    }));
  }
  return templateExercises.map((te) => ({
    key: `tpl-${te.id}`,
    exerciseId: te.exercise_id,
  }));
}

function templateForExercise(
  templateExercises: TemplateWithExercises["exercises"],
  exerciseId: number
) {
  return templateExercises.find((te) => te.exercise_id === exerciseId);
}

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
  const isSession = (workout.sessionExerciseLogOrder?.length ?? 0) > 0;

  const [elapsed, setElapsed] = useState(0);
  const [slots, setSlots] = useState<Slot[]>(() => buildSlots(workout, templateExercises));
  const [currentSlotIndex, setCurrentSlotIndex] = useState(0);
  const [sets, setSets] = useState(workout.sets);
  const [weight, setWeight] = useState(0);
  const [reps, setReps] = useState(8);
  const [isFailure, setIsFailure] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(() => new Set());
  const [remarks, setRemarks] = useState("");
  const [restPresetSec, setRestPresetSec] = useState(restTimerSeconds);
  const [saving, setSaving] = useState(false);
  const [lastSavedSet, setLastSavedSet] = useState<{ exerciseId: number; weight: number } | null>(
    null
  );
  const [restTimerActive, setRestTimerActive] = useState(false);
  const [activeRestDuration, setActiveRestDuration] = useState(restTimerSeconds);
  const [weightIncreased, setWeightIncreased] = useState(false);
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [endDialogStep, setEndDialogStep] = useState<EndDialogStep>("choice");
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editSetWeight, setEditSetWeight] = useState(0);
  const [editSetReps, setEditSetReps] = useState(1);
  const [editSetIsFailure, setEditSetIsFailure] = useState(false);
  const [editSetTags, setEditSetTags] = useState<Set<string>>(new Set());
  const [editSetRemarks, setEditSetRemarks] = useState("");
  const [editSetRest, setEditSetRest] = useState<number | null>(null);
  const optimisticRef = useRef<Set<string>>(new Set());
  const saveInFlightRef = useRef(false);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSlots(buildSlots(workout, templateExercises));
  }, [workout.id, workout.sessionExerciseLogOrder, templateExercises]);

  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    setSets(workout.sets);
  }, [workout.id, workout.sets]);

  useEffect(() => {
    const start = new Date(workout.start_time).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [workout.start_time]);

  const currentSlot = slots[currentSlotIndex];
  const currentExercise = currentSlot
    ? templateForExercise(templateExercises, currentSlot.exerciseId)
    : undefined;

  const exerciseSets = useMemo(() => {
    if (!currentSlot) return [];
    return sets
      .filter((s) => s.exercise_id === currentSlot.exerciseId)
      .sort((a, b) => a.set_index - b.set_index);
  }, [sets, currentSlot]);

  /** Only persisted rows participate in drag + server reorder (avoids `opt-*` in payloads). */
  const persistedExerciseSets = useMemo(
    () => exerciseSets.filter((s) => !s.id.startsWith("opt-")),
    [exerciseSets]
  );
  const optimisticExerciseSets = useMemo(
    () => exerciseSets.filter((s) => s.id.startsWith("opt-")),
    [exerciseSets]
  );

  const exerciseSortableIds = useMemo(() => persistedExerciseSets.map((s) => s.id), [persistedExerciseSets]);

  const templateSets = currentExercise?.sets ?? [];
  const targetSets = (templateSets.length || currentExercise?.target_sets) ?? 1;
  const nextSetIndex = exerciseSets.length;
  const currentTemplateSet = templateSets[nextSetIndex];
  const setTagWarmup = currentTemplateSet
    ? currentTemplateSet.tag === "warmup"
    : (currentExercise?.is_warmup ?? false);
  const setTagFailure = currentTemplateSet?.tag === "failure" || isFailure;
  const history = currentExercise ? historyMap[currentExercise.exercise_id] ?? [] : [];
  const lastSessionBest =
    history[0]?.sets?.filter((s) => !s.is_warmup).reduce((max, s) => Math.max(max, s.weight_kg), 0) ??
    0;

  const exerciseOrderIndex = currentSlotIndex;

  const refreshFromServer = useCallback(async () => {
    if (saveInFlightRef.current) return;
    const snap = await getWorkoutSetsSnapshotAction(workout.id);
    setSets(snap.sets);
    if (snap.exerciseLogOrder?.length) {
      setSlots(
        snap.exerciseLogOrder.map((e) => ({
          key: e.logId,
          exerciseId: e.exerciseId,
          logId: e.logId,
        }))
      );
    }
  }, [workout.id]);

  const scheduleRefreshFromServer = useCallback(() => {
    if (saveInFlightRef.current) return;
    if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    refreshTimeoutRef.current = setTimeout(() => {
      refreshTimeoutRef.current = null;
      void refreshFromServer();
    }, 200);
  }, [refreshFromServer]);

  const logIdsKey = useMemo(
    () =>
      slots
        .map((s) => s.logId)
        .filter(Boolean)
        .sort()
        .join(","),
    [slots]
  );

  useEffect(() => {
    if (!isSession) return;
    const supabase = createClient();
    const ids = logIdsKey ? logIdsKey.split(",").filter(Boolean) : [];

    const channel = supabase.channel(`workout-live-${workout.id}`).on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "exercise_logs",
        filter: `session_id=eq.${workout.id}`,
      },
      () => {
        scheduleRefreshFromServer();
      }
    );

    for (const id of ids) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sets",
          filter: `exercise_log_id=eq.${id}`,
        },
        () => {
          scheduleRefreshFromServer();
        }
      );
    }

    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isSession, workout.id, logIdsKey, scheduleRefreshFromServer]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleExerciseDragEnd = async (event: DragEndEvent) => {
    if (!isSession) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    if (active.data.current?.type === "set") return;
    const keys = slots.map((s) => s.key);
    const oldIndex = keys.indexOf(String(active.id));
    const newIndex = keys.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(slots, oldIndex, newIndex);
    setSlots(next);
    setCurrentSlotIndex((i) => {
      if (i === oldIndex) return newIndex;
      if (oldIndex < newIndex && i > oldIndex && i <= newIndex) return i - 1;
      if (oldIndex > newIndex && i >= newIndex && i < oldIndex) return i + 1;
      return i;
    });
    const logIds = next.map((s) => s.logId).filter(Boolean) as string[];
    if (logIds.length === next.length) {
      try {
        await reorderExerciseLogsAction(workout.id, logIds);
      } catch {
        await refreshFromServer();
      }
    }
  };

  const handleSetsDragEnd = async (event: DragEndEvent) => {
    if (!isSession || !currentSlot?.logId) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    if (active.data.current?.type !== "set") return;
    const ids = exerciseSortableIds;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove([...persistedExerciseSets], oldIndex, newIndex).map((s, i) => ({
      ...s,
      set_index: i,
    }));
    setSets((prev) => {
      const others = prev.filter((s) => s.exercise_id !== currentSlot.exerciseId);
      const optimistic = prev.filter(
        (s) => s.exercise_id === currentSlot.exerciseId && s.id.startsWith("opt-")
      );
      return [...others, ...reordered, ...optimistic];
    });
    try {
      await reorderSessionSetsAction(
        currentSlot.logId,
        reordered.map((s) => s.id)
      );
    } catch {
      await refreshFromServer();
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const n = new Set(prev);
      if (n.has(tag)) n.delete(tag);
      else n.add(tag);
      return n;
    });
  };

  const handleSaveSet = useCallback(async () => {
    if (!currentExercise || !currentSlot || saving) return;

    const tagList = [...selectedTags];
    const tempId = `opt-${Date.now()}`;
    const optimistic: WorkoutSet = {
      id: tempId,
      workout_id: workout.id,
      exercise_id: currentExercise.exercise_id,
      set_index: nextSetIndex,
      weight_kg: weight,
      reps,
      rpe: null,
      rest_seconds: restPresetSec,
      is_warmup: setTagWarmup,
      is_failure: setTagFailure,
      created_at: new Date().toISOString(),
      session_tags: [...tagList, ...(setTagWarmup ? ["warmup"] : []), ...(setTagFailure ? ["failure"] : [])],
      remarks: remarks.trim() || null,
    };
    optimisticRef.current.add(tempId);
    setSets((prev) => [...prev, optimistic]);
    saveInFlightRef.current = true;
    setSaving(true);
    try {
      const { set: saved } = await saveSetAction(
        workout.id,
        currentExercise.exercise_id,
        nextSetIndex,
        weight,
        reps,
        {
          isWarmup: setTagWarmup,
          isFailure: setTagFailure,
          ...(currentSlot.logId
            ? { exerciseLogId: currentSlot.logId }
            : { exerciseOrderIndex }),
          tags: tagList,
          remarks: remarks.trim() || null,
          restSeconds: restPresetSec,
        }
      );
      optimisticRef.current.delete(tempId);
      setSets((prev) => prev.filter((s) => s.id !== tempId).concat(saved));
      setLastSavedSet({ exerciseId: currentExercise.exercise_id, weight });
      setWeightIncreased(weight > lastSessionBest);
      setActiveRestDuration(restPresetSec);
      setRestTimerActive(true);
      setRemarks("");
      setSelectedTags(new Set());
    } catch {
      optimisticRef.current.delete(tempId);
      setSets((prev) => prev.filter((s) => s.id !== tempId));
    } finally {
      saveInFlightRef.current = false;
      setSaving(false);
    }
  }, [
    currentExercise,
    currentSlot,
    workout.id,
    nextSetIndex,
    weight,
    reps,
    setTagWarmup,
    setTagFailure,
    exerciseOrderIndex,
    selectedTags,
    remarks,
    restPresetSec,
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

  const startEditingSet = (set: WorkoutSet) => {
    setEditingSetId(set.id);
    setEditSetWeight(set.weight_kg);
    setEditSetReps(set.reps);
    setEditSetIsFailure(set.is_failure);
    const t = new Set<string>();
    (set.session_tags ?? []).forEach((x) => {
      if (TAG_CHIPS.includes(x as (typeof TAG_CHIPS)[number])) t.add(x);
    });
    setEditSetTags(t);
    setEditSetRemarks(set.remarks ?? "");
    setEditSetRest(set.rest_seconds);
  };

  const handleUpdateSet = async () => {
    if (!editingSetId) return;
    const edited = sets.find((x) => x.id === editingSetId);
    const tagList = [...editSetTags];
    if (edited?.is_warmup) tagList.push("warmup");
    if (editSetIsFailure) tagList.push("failure");
    else {
      const i = tagList.indexOf("failure");
      if (i >= 0) tagList.splice(i, 1);
    }
    const uniqueTags = [...new Set(tagList.map((t) => t.trim()).filter(Boolean))];
    try {
      await updateSetAction(editingSetId, {
        weight_kg: editSetWeight,
        reps: editSetReps,
        is_failure: editSetIsFailure,
        is_warmup: edited?.is_warmup,
        tags: uniqueTags,
        remarks: editSetRemarks.trim() || null,
        rest_seconds: editSetRest,
      });
      setSets((prev) =>
        prev.map((s) =>
          s.id === editingSetId
            ? {
                ...s,
                weight_kg: editSetWeight,
                reps: editSetReps,
                is_failure: editSetIsFailure,
                session_tags: uniqueTags,
                remarks: editSetRemarks.trim() || null,
                rest_seconds: editSetRest,
              }
            : s
        )
      );
      setEditingSetId(null);
    } catch {
      /* keep dialog open */
    }
  };

  const handleDeleteSet = async (setId: string) => {
    if (!confirm("Delete this set?")) return;
    try {
      await deleteSetAction(setId);
      setSets((prev) => prev.filter((s) => s.id !== setId));
    } catch {
      /* noop */
    }
  };

  if (templateExercises.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 max-w-mobile mx-auto">
        <div className="glass-panel p-8 text-center space-y-6 max-w-lg w-full">
          <p className="text-muted-foreground font-medium">No exercises in this workout.</p>
          <p className="text-sm text-muted-foreground">
            Add exercises from a template or end and start a new one.
          </p>
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
    <div className="min-h-screen pb-36 flex flex-col items-center max-w-mobile mx-auto w-full">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="sticky top-0 z-10 w-full p-4"
      >
        <div className="glass-panel p-4 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-sm uppercase tracking-wider text-primary break-words max-w-[180px] sm:max-w-[220px]">
              {workout.name}
            </h1>
            <p className="text-2xl font-bold tracking-tight mt-1 tabular-nums">{formatElapsed(elapsed)}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 flex items-center justify-center rounded-full border border-white/10 bg-background/30">
              <span className="text-xs font-bold text-muted-foreground">{sets.length}</span>
              <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="text-border/30"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="text-primary drop-shadow-[0_0_5px_hsl(var(--primary)/0.5)]"
                  strokeDasharray="125.6"
                  strokeDashoffset={Math.max(
                    0,
                    125.6 -
                      125.6 *
                        (sets.length /
                          Math.max(
                            1,
                            templateExercises.reduce(
                              (acc, te) => acc + (te.sets?.length ?? te.target_sets ?? 1),
                              0
                            )
                          ))
                  )}
                  style={{ transition: "stroke-dashoffset 0.5s ease" }}
                />
              </svg>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-14 w-14 rounded-full border border-white/10 bg-background/40 text-destructive hover:text-destructive touch-manipulation min-h-[56px] min-w-[56px]"
              onClick={openEndDialog}
              aria-label="End or discard workout"
            >
              <Square className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </motion.div>

      <div className="w-full p-4 space-y-6 flex-1 flex flex-col">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(e) => {
            if (!isSession) return;
            void handleExerciseDragEnd(e);
            void handleSetsDragEnd(e);
          }}
        >
          <div className="glass-panel max-h-[220px] overflow-hidden flex flex-col">
            <div className="overflow-y-auto scrollbar-neu p-2 flex flex-col gap-2">
              {isSession ? (
                <SortableContext items={slots.map((s) => s.key)} strategy={verticalListSortingStrategy}>
                  {slots.map((slot, i) => {
                    const te = templateForExercise(templateExercises, slot.exerciseId);
                    if (!te) return null;
                    const completed =
                      sets.filter((s) => s.exercise_id === slot.exerciseId).length >=
                      (te.sets?.length ?? te.target_sets ?? 1);
                    const isActive = i === currentSlotIndex;
                    return (
                      <SortableExerciseRow
                        key={slot.key}
                        id={slot.key}
                        disabled={false}
                        isActive={isActive}
                        completed={completed}
                        label={te.exercise.name}
                        onSelect={() => setCurrentSlotIndex(i)}
                      />
                    );
                  })}
                </SortableContext>
              ) : (
                slots.map((slot, i) => {
                  const te = templateForExercise(templateExercises, slot.exerciseId);
                  if (!te) return null;
                  const completed =
                    sets.filter((s) => s.exercise_id === slot.exerciseId).length >=
                    (te.sets?.length ?? te.target_sets ?? 1);
                  const isActive = i === currentSlotIndex;
                  return (
                    <button
                      key={slot.key}
                      type="button"
                      onClick={() => setCurrentSlotIndex(i)}
                      className={`w-full text-left px-4 py-3 sm:py-4 rounded-2xl text-sm sm:text-base font-bold transition-all duration-200 break-words touch-manipulation min-h-[48px] ${
                        isActive
                          ? "text-primary bg-primary/10 ring-1 ring-primary/30"
                          : completed
                            ? "text-muted-foreground opacity-60"
                            : "text-foreground bg-background/20 hover:bg-background/35"
                      }`}
                    >
                      {te.exercise.name}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {currentExercise && currentSlot && (
            <motion.div
            key={currentSlot.key}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="space-y-6 flex-1 flex flex-col"
          >
            <div className="text-center space-y-1">
              <h2 className="font-bold text-2xl tracking-tight break-words">{currentExercise.exercise.name}</h2>
              <p className="text-sm text-primary font-medium tracking-wide">
                TARGET: {targetSets} SETS
                {currentTemplateSet
                  ? ` × ${currentTemplateSet.reps_min ?? "?"}-${currentTemplateSet.reps_max ?? "?"} REPS (${currentTemplateSet.tag.toUpperCase()})`
                  : currentExercise.target_reps_min
                    ? ` × ${currentExercise.target_reps_min}-${currentExercise.target_reps_max} REPS`
                    : ""}
              </p>
              {history[0] && (
                <p className="text-xs text-muted-foreground uppercase tracking-wider mt-2">
                  Last Session:{" "}
                  {history[0].sets
                    .filter((s) => !s.is_warmup)
                    .map((s) => `${s.weight_kg}kg × ${s.reps}`)
                    .join(", ")}
                </p>
              )}
            </div>

            <div className="relative max-h-[260px] overflow-y-auto scrollbar-neu pr-1 -mr-1">
              <div className="space-y-3 mt-2 pb-4">
                {isSession && currentSlot.logId ? (
                  <>
                    <SortableContext items={exerciseSortableIds} strategy={verticalListSortingStrategy}>
                      <AnimatePresence initial={false}>
                        {persistedExerciseSets.map((s, i) => (
                          <SortableSetRow
                            key={s.id}
                            id={s.id}
                            index={i}
                            set={s}
                            editingSetId={editingSetId}
                            editSetWeight={editSetWeight}
                            editSetReps={editSetReps}
                            editSetIsFailure={editSetIsFailure}
                            editSetTags={editSetTags}
                            editSetRemarks={editSetRemarks}
                            editSetRest={editSetRest}
                            setEditSetWeight={setEditSetWeight}
                            setEditSetReps={setEditSetReps}
                            setEditSetIsFailure={setEditSetIsFailure}
                            setEditSetTags={setEditSetTags}
                            setEditSetRemarks={setEditSetRemarks}
                            setEditSetRest={setEditSetRest}
                            onSaveEdit={handleUpdateSet}
                            onCancelEdit={() => setEditingSetId(null)}
                            onStartEdit={startEditingSet}
                            onDelete={handleDeleteSet}
                          />
                        ))}
                      </AnimatePresence>
                    </SortableContext>
                    <AnimatePresence initial={false}>
                      {optimisticExerciseSets.map((s, i) => (
                        <SetRowStatic
                          key={s.id}
                          set={s}
                          index={persistedExerciseSets.length + i}
                          editingSetId={editingSetId}
                          editSetWeight={editSetWeight}
                          editSetReps={editSetReps}
                          editSetIsFailure={editSetIsFailure}
                          editSetTags={editSetTags}
                          editSetRemarks={editSetRemarks}
                          editSetRest={editSetRest}
                          setEditSetWeight={setEditSetWeight}
                          setEditSetReps={setEditSetReps}
                          setEditSetIsFailure={setEditSetIsFailure}
                          setEditSetTags={setEditSetTags}
                          setEditSetRemarks={setEditSetRemarks}
                          setEditSetRest={setEditSetRest}
                          onSaveEdit={handleUpdateSet}
                          onCancelEdit={() => setEditingSetId(null)}
                          onStartEdit={startEditingSet}
                          onDelete={handleDeleteSet}
                        />
                      ))}
                    </AnimatePresence>
                  </>
                ) : (
                  <AnimatePresence initial={false}>
                    {exerciseSets.map((s, i) => (
                      <SetRowStatic
                        key={s.id}
                        set={s}
                        index={i}
                        editingSetId={editingSetId}
                        editSetWeight={editSetWeight}
                        editSetReps={editSetReps}
                        editSetIsFailure={editSetIsFailure}
                        editSetTags={editSetTags}
                        editSetRemarks={editSetRemarks}
                        editSetRest={editSetRest}
                        setEditSetWeight={setEditSetWeight}
                        setEditSetReps={setEditSetReps}
                        setEditSetIsFailure={setEditSetIsFailure}
                        setEditSetTags={setEditSetTags}
                        setEditSetRemarks={setEditSetRemarks}
                        setEditSetRest={setEditSetRest}
                        onSaveEdit={handleUpdateSet}
                        onCancelEdit={() => setEditingSetId(null)}
                        onStartEdit={startEditingSet}
                        onDelete={handleDeleteSet}
                      />
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </div>

            {nextSetIndex < targetSets && (
              <motion.div
                layout
                className="fixed bottom-0 left-0 right-0 z-50 max-w-mobile mx-auto w-full glass-nav border-t border-white/10 rounded-t-3xl p-4 space-y-4 safe-area-pb"
              >
                <div className="flex flex-wrap gap-2 justify-center">
                  {[30, 60, 90, 120].map((sec) => (
                    <Button
                      key={sec}
                      type="button"
                      size="sm"
                      variant={restPresetSec === sec ? "default" : "outline"}
                      className="rounded-full h-9 px-3 text-xs"
                      onClick={() => setRestPresetSec(sec)}
                    >
                      {sec}s
                    </Button>
                  ))}
                  <Button
                    type="button"
                    size="sm"
                    variant={restPresetSec === restTimerSeconds ? "default" : "outline"}
                    className="rounded-full h-9 px-3 text-xs"
                    onClick={() => setRestPresetSec(restTimerSeconds)}
                  >
                    Profile
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2 justify-center">
                  {TAG_CHIPS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-all ${
                        selectedTags.has(tag)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background/30 border-white/15 text-muted-foreground"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Remarks (optional)"
                  rows={2}
                  className="w-full rounded-2xl bg-background/40 border border-white/10 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
                />

                <div className="flex items-center justify-between px-1 sm:px-2 gap-2">
                  <div className="flex flex-col items-center gap-2 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Weight (kg)
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="rounded-full h-12 w-12 border border-white/10 touch-manipulation"
                        onClick={() => setWeight((w) => Math.max(0, w - 2.5))}
                      >
                        <Minus className="h-5 w-5" />
                      </Button>
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={weight}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "") setWeight(0);
                          else {
                            const num = parseFloat(val);
                            setWeight(Number.isNaN(num) ? 0 : Math.max(0, num));
                          }
                        }}
                        onBlur={() => setWeight((w) => Math.max(0, w || 0))}
                        className="w-16 h-16 rounded-2xl bg-background/40 border border-white/10 text-center text-xl font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none focus:ring-2 focus:ring-primary/40 touch-manipulation"
                        aria-label="Weight in kg"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="rounded-full h-12 w-12 border border-white/10 text-primary touch-manipulation"
                        onClick={() => setWeight((w) => w + 2.5)}
                      >
                        <Plus className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>

                  <div className="w-px h-20 bg-border/40 rounded-full mx-1" />

                  <div className="flex flex-col items-center gap-2 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Reps</span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="rounded-full h-12 w-12 border border-white/10 touch-manipulation"
                        onClick={() => setReps((r) => Math.max(1, r - 1))}
                      >
                        <Minus className="h-5 w-5" />
                      </Button>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={reps}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "") setReps(0);
                          else {
                            const num = parseInt(val, 10);
                            setReps(Number.isNaN(num) ? 0 : Math.max(0, num));
                          }
                        }}
                        onBlur={() => setReps((r) => Math.max(1, r || 1))}
                        className="w-16 h-16 rounded-2xl bg-background/40 border border-white/10 text-center text-xl font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none focus:ring-2 focus:ring-primary/40 touch-manipulation"
                        aria-label="Reps"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="rounded-full h-12 w-12 border border-white/10 text-primary touch-manipulation"
                        onClick={() => setReps((r) => r + 1)}
                      >
                        <Plus className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    className={`rounded-full h-14 px-4 flex-shrink-0 touch-manipulation border ${
                      setTagFailure
                        ? "border-destructive/50 text-destructive bg-destructive/10"
                        : "border-white/10 text-muted-foreground"
                    }`}
                    onClick={() => setIsFailure((f) => !f)}
                  >
                    <Flag className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="text-sm">Failure</span>
                  </Button>
                  <Button
                    className="flex-1 rounded-full h-14 text-base font-bold touch-manipulation shadow-[0_0_20px_hsl(var(--primary)/0.25)]"
                    onClick={handleSaveSet}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Log Set"}
                  </Button>
                </div>
              </motion.div>
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
          </motion.div>
          )}

          <div className="flex gap-3 pt-4 pb-6">
            <Button
              variant="ghost"
              className="flex-1 rounded-full h-12 glass-panel border-0 touch-manipulation disabled:opacity-30"
              disabled={currentSlotIndex === 0}
              onClick={() => setCurrentSlotIndex((i) => Math.max(0, i - 1))}
            >
              Previous
            </Button>
            <Button
              variant="ghost"
              className="flex-1 rounded-full h-12 glass-panel border-0 text-primary touch-manipulation disabled:opacity-30"
              disabled={currentSlotIndex >= slots.length - 1}
              onClick={() => setCurrentSlotIndex((i) => Math.min(slots.length - 1, i + 1))}
            >
              Next
            </Button>
          </div>
        </DndContext>
      </div>

      <RestTimer
        seconds={activeRestDuration}
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

function SortableExerciseRow({
  id,
  disabled,
  isActive,
  completed,
  label,
  onSelect,
}: {
  id: string;
  disabled: boolean;
  isActive: boolean;
  completed: boolean;
  label: string;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
    data: { type: "exercise" as const },
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-1 rounded-2xl touch-manipulation ${
        isDragging ? "opacity-60 z-20" : ""
      }`}
    >
      <button
        type="button"
        className="p-2 rounded-xl text-muted-foreground hover:text-foreground touch-manipulation"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onSelect}
        className={`flex-1 text-left px-3 py-3 rounded-2xl text-sm font-bold transition-all break-words min-h-[48px] ${
          isActive
            ? "text-primary bg-primary/10 ring-1 ring-primary/30"
            : completed
              ? "text-muted-foreground opacity-60"
              : "text-foreground bg-background/20 hover:bg-background/35"
        }`}
      >
        {label}
      </button>
    </div>
  );
}

function SortableSetRow(props: SetRowProps & { id: string }) {
  const { id, ...row } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    data: { type: "set" as const },
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className={isDragging ? "opacity-70 z-20" : ""}>
      <SetRowContent {...row} set={row.set} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

type SetRowProps = {
  id?: string;
  set: WorkoutSet;
  index: number;
  editingSetId: string | null;
  editSetWeight: number;
  editSetReps: number;
  editSetIsFailure: boolean;
  editSetTags: Set<string>;
  editSetRemarks: string;
  editSetRest: number | null;
  setEditSetWeight: Dispatch<SetStateAction<number>>;
  setEditSetReps: Dispatch<SetStateAction<number>>;
  setEditSetIsFailure: Dispatch<SetStateAction<boolean>>;
  setEditSetTags: Dispatch<SetStateAction<Set<string>>>;
  setEditSetRemarks: Dispatch<SetStateAction<string>>;
  setEditSetRest: Dispatch<SetStateAction<number | null>>;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onStartEdit: (s: WorkoutSet) => void;
  onDelete: (id: string) => void;
  dragHandleProps?: Record<string, unknown>;
};

function SetRowStatic(props: Omit<SetRowProps, "id" | "dragHandleProps">) {
  return <SetRowContent {...props} />;
}

function SetRowContent({
  set: s,
  index,
  editingSetId,
  editSetWeight,
  editSetReps,
  editSetIsFailure,
  editSetTags,
  editSetRemarks,
  editSetRest,
  setEditSetWeight,
  setEditSetReps,
  setEditSetIsFailure,
  setEditSetTags,
  setEditSetRemarks,
  setEditSetRest,
  onSaveEdit,
  onCancelEdit,
  onStartEdit,
  onDelete,
  dragHandleProps,
}: SetRowProps) {
  const toggleEditTag = (tag: string) => {
    setEditSetTags((prev) => {
      const n = new Set(prev);
      if (n.has(tag)) n.delete(tag);
      else n.add(tag);
      return n;
    });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0, scale: 0.96 }}
      animate={{ opacity: 1, height: "auto", scale: 1 }}
      exit={{ opacity: 0, height: 0 }}
      className="group flex justify-between items-start gap-2 p-4 rounded-2xl glass-panel min-h-[72px]"
    >
      {dragHandleProps && (
        <button
          type="button"
          className="mt-1 p-1 rounded-lg text-muted-foreground shrink-0 touch-manipulation"
          aria-label="Drag set"
          {...dragHandleProps}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      {editingSetId === s.id ? (
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="number"
              min={0}
              step={0.5}
              value={editSetWeight}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "") setEditSetWeight(0);
                else {
                  const num = parseFloat(val);
                  setEditSetWeight(Number.isNaN(num) ? 0 : Math.max(0, num));
                }
              }}
              className="w-16 h-9 rounded-lg bg-background/40 border border-white/10 text-center text-sm font-bold"
              aria-label="Edit weight"
            />
            <span className="text-xs text-muted-foreground">kg</span>
            <span className="text-muted-foreground">×</span>
            <input
              type="number"
              min={1}
              value={editSetReps}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "") setEditSetReps(0);
                else {
                  const num = parseInt(val, 10);
                  setEditSetReps(Number.isNaN(num) ? 0 : Math.max(0, num));
                }
              }}
              onBlur={() => setEditSetReps((r) => Math.max(1, r || 1))}
              className="w-14 h-9 rounded-lg bg-background/40 border border-white/10 text-center text-sm font-bold"
              aria-label="Edit reps"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {TAG_CHIPS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleEditTag(tag)}
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                  editSetTags.has(tag) ? "bg-primary/90 border-primary text-primary-foreground" : "border-white/15"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
          <input
            type="number"
            min={0}
            placeholder="Rest sec"
            value={editSetRest ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              setEditSetRest(v === "" ? null : Math.max(0, parseInt(v, 10) || 0));
            }}
            className="w-full rounded-lg bg-background/40 border border-white/10 px-2 py-1 text-xs"
          />
          <textarea
            value={editSetRemarks}
            onChange={(e) => setEditSetRemarks(e.target.value)}
            rows={2}
            className="w-full rounded-lg bg-background/40 border border-white/10 px-2 py-1 text-xs resize-none"
            placeholder="Remarks"
          />
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={`rounded-full ${editSetIsFailure ? "text-destructive" : ""}`}
              onClick={() => setEditSetIsFailure((f) => !f)}
            >
              <Flag className="h-3 w-3 mr-1" />
              Fail
            </Button>
            <Button type="button" size="sm" className="rounded-full flex-1" onClick={onSaveEdit}>
              <Check className="h-4 w-4 mr-1" />
              Save
            </Button>
            <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={onCancelEdit}>
              <Minus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="h-9 w-9 rounded-full border border-white/15 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
              {index + 1}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-base truncate">
                {s.weight_kg} kg <span className="text-muted-foreground font-normal mx-1">×</span> {s.reps}
              </span>
              {s.is_failure && (
                <span className="text-[10px] text-destructive font-medium uppercase tracking-wider">Failure</span>
              )}
              {(s.session_tags?.length ?? 0) > 0 && (
                <span className="text-[10px] text-muted-foreground truncate">
                  {s.session_tags?.filter((t) => t !== "failure" && t !== "warmup").join(", ")}
                </span>
              )}
              {s.remarks && (
                <span className="text-[10px] text-muted-foreground line-clamp-2">{s.remarks}</span>
              )}
              {s.rest_seconds != null && (
                <span className="text-[10px] text-primary/80">Rest {s.rest_seconds}s</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-10 w-10 rounded-full touch-manipulation"
              onClick={() => onStartEdit(s)}
              aria-label="Edit set"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-10 w-10 rounded-full touch-manipulation text-destructive"
              onClick={() => onDelete(s.id)}
              aria-label="Delete set"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Check className="h-5 w-5 text-primary flex-shrink-0 ml-1" />
          </div>
        </>
      )}
    </motion.div>
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
      <DialogContent showClose={step === "choice"} className="rounded-3xl glass-panel border-white/20">
        {step === "choice" && (
          <>
            <DialogHeader>
              <DialogTitle>End workout?</DialogTitle>
              <DialogDescription>
                Save and finish this workout, or discard it and leave without saving.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
              <Button
                variant="outline"
                className="rounded-full h-12 flex-1 touch-manipulation min-h-[48px]"
                onClick={() => onOpenChange(false)}
              >
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
              <Button className="rounded-full h-12 flex-1 touch-manipulation min-h-[48px]" onClick={() => onStepChange("confirm-save")}>
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
              <Button
                variant="outline"
                className="rounded-full h-12 flex-1 touch-manipulation min-h-[48px]"
                onClick={() => onStepChange("choice")}
              >
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
              <DialogDescription>All logged sets will be lost. This cannot be undone.</DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
              <Button
                variant="outline"
                className="rounded-full h-12 flex-1 touch-manipulation min-h-[48px]"
                onClick={() => onStepChange("choice")}
              >
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
