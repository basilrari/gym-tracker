"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Play, ChevronLeft, ChevronUp, ChevronDown, Calendar, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { TemplateWithExercises, TemplateExerciseSet } from "@/lib/db/types";
import type { Exercise } from "@/lib/db/types";
import { updateTemplateAction, addTemplateExerciseAction, removeTemplateExerciseAction, reorderTemplateExercisesAction, updateTemplateExerciseAction, addTemplateExerciseSetAction, updateTemplateExerciseSetAction, removeTemplateExerciseSetAction } from "@/app/actions/templates";
import { createExerciseAction } from "@/app/actions/exercises";

const PRESET_TAGS = [
  { value: "warmup", label: "Warmup" },
  { value: "light", label: "Light" },
  { value: "hard", label: "Hard" },
  { value: "failure", label: "Failure" },
] as const;
const PRESET_VALUES = new Set(PRESET_TAGS.map((t) => t.value));
function isPresetTag(tag: string): boolean {
  return PRESET_VALUES.has(tag as (typeof PRESET_TAGS)[number]["value"]);
}

const DAY_LABELS: { value: number; label: string }[] = [
  { value: 1, label: "M" },
  { value: 2, label: "T" },
  { value: 3, label: "W" },
  { value: 4, label: "T" },
  { value: 5, label: "F" },
  { value: 6, label: "S" },
  { value: 7, label: "S" },
];

type TemplateDetailClientProps = {
  template: TemplateWithExercises;
  allExercises: Exercise[];
  startWorkoutAction: (
    templateId?: string | null,
    name?: string
  ) => Promise<void>;
};

export function TemplateDetailClient({
  template,
  allExercises,
  startWorkoutAction,
}: TemplateDetailClientProps) {
  const router = useRouter();
  const [exercises, setExercises] = useState(template.exercises);
  const [scheduledDays, setScheduledDays] = useState<number[]>(
    template.scheduled_days ?? []
  );
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState(template.name);
  const [editingDesc, setEditingDesc] = useState(false);
  const [editDescription, setEditDescription] = useState(
    template.description ?? ""
  );
  const [addExerciseOpen, setAddExerciseOpen] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [createCustomOpen, setCreateCustomOpen] = useState(false);
  const [customExerciseName, setCustomExerciseName] = useState("");
  const [customExerciseEquipment, setCustomExerciseEquipment] = useState("");
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [editExerciseName, setEditExerciseName] = useState("");
  const [editingExerciseDetails, setEditingExerciseDetails] = useState<string | null>(null);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editRepsMin, setEditRepsMin] = useState<number | null>(null);
  const [editRepsMax, setEditRepsMax] = useState<number | null>(null);
  const [editWeight, setEditWeight] = useState<number | null>(null);
  const [editTag, setEditTag] = useState<string>("warmup");
  const [addingSetForTeId, setAddingSetForTeId] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  async function handleStartWorkout() {
    setIsStarting(true);
    try {
      await startWorkoutAction(template.id, template.name);
    } finally {
      setIsStarting(false);
      setShowConfirmDialog(false);
    }
  }

  async function toggleDay(day: number) {
    const next = scheduledDays.includes(day)
      ? scheduledDays.filter((d) => d !== day)
      : [...scheduledDays, day].sort((a, b) => a - b);
    setScheduledDays(next);
    const result = await updateTemplateAction(template.id, { scheduled_days: next });
    if (result?.error) {
      setScheduledDays(scheduledDays);
      router.refresh();
      return;
    }
    if (result?.redirectTo) {
      router.push(result.redirectTo);
      return;
    }
  }

  async function saveName() {
    const name = editName.trim() || template.name;
    try {
      const result = await updateTemplateAction(template.id, { name });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      if (result?.redirectTo) {
        router.push(result.redirectTo);
        return;
      }
      setEditName(name);
      setEditingName(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save name.");
    }
  }

  async function saveDescription() {
    try {
      const result = await updateTemplateAction(template.id, {
        description: editDescription.trim() || null,
      });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      if (result?.redirectTo) {
        router.push(result.redirectTo);
        return;
      }
      setEditingDesc(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save description.");
    }
  }

  const existingExerciseIds = new Set(exercises.map((e) => e.exercise_id));
  const availableExercises = allExercises.filter(
    (e) =>
      !existingExerciseIds.has(e.id) &&
      e.name.toLowerCase().includes(exerciseSearch.toLowerCase())
  );

  async function addExercise(exerciseId: number) {
    await addTemplateExerciseAction(
      template.id,
      exerciseId,
      exercises.length,
      { targetSets: 1 }
    );
    setAddExerciseOpen(false);
    setExerciseSearch("");
    router.refresh();
  }

  async function handleCreateCustomExercise() {
    const name = customExerciseName.trim();
    if (!name) return;
    const exercise = await createExerciseAction(name, customExerciseEquipment.trim() || null);
    if (exercise) {
      await addTemplateExerciseAction(template.id, exercise.id, exercises.length, { targetSets: 1 });
      setCreateCustomOpen(false);
      setAddExerciseOpen(false);
      setCustomExerciseName("");
      setCustomExerciseEquipment("");
      router.refresh();
    }
  }

  async function removeExercise(templateExerciseId: string) {
    await removeTemplateExerciseAction(templateExerciseId);
    setExercises((prev) => prev.filter((e) => e.id !== templateExerciseId));
    router.refresh();
  }

  async function saveExerciseName() {
    if (!editingExerciseId) return;
    try {
      const result = await updateTemplateExerciseAction(editingExerciseId, {
        display_name: editExerciseName.trim() || null,
      });
      if (result?.redirectTo) {
        router.push(result.redirectTo);
        return;
      }
      setExercises((prev) =>
        prev.map((e) =>
          e.id === editingExerciseId
            ? { ...e, display_name: editExerciseName.trim() || null }
            : e
        )
      );
      setEditingExerciseId(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save name.");
    }
  }

  function startEditingSet(set: TemplateExerciseSet) {
    setEditingSetId(set.id);
    setEditRepsMin(set.reps_min);
    setEditRepsMax(set.reps_max);
    setEditWeight(set.weight_kg);
    setEditTag(set.tag || "warmup");
  }

  async function saveSetEdits() {
    if (!editingSetId) return;
    const tagToSave = (editTag || "").trim() || "warmup";
    try {
      await updateTemplateExerciseSetAction(editingSetId, {
        reps_min: editRepsMin ?? undefined,
        reps_max: editRepsMax ?? undefined,
        weight_kg: editWeight ?? undefined,
        tag: tagToSave,
      });
      setExercises((prev) =>
        prev.map((e) => ({
          ...e,
          sets: e.sets.map((s) =>
            s.id === editingSetId
              ? { ...s, reps_min: editRepsMin, reps_max: editRepsMax, weight_kg: editWeight, tag: tagToSave }
              : s
          ),
        }))
      );
      setEditingSetId(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save set.");
    }
  }

  async function handleAddSet(teId: string) {
    const te = exercises.find((e) => e.id === teId);
    if (!te) return;
    setAddingSetForTeId(teId);
    try {
      const result = await addTemplateExerciseSetAction(teId, te.sets.length, { tag: "warmup" });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      if (result?.redirectTo) {
        router.push(result.redirectTo);
        return;
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add set.");
    } finally {
      setAddingSetForTeId(null);
    }
  }

  async function handleRemoveSet(setId: string, teId: string) {
    await removeTemplateExerciseSetAction(setId);
    setExercises((prev) =>
      prev.map((e) =>
        e.id === teId ? { ...e, sets: e.sets.filter((s) => s.id !== setId) } : e
      )
    );
    router.refresh();
  }

  function startEditingDetails(te: typeof exercises[0]) {
    setEditingExerciseDetails(te.id);
    setEditingSetId(null);
  }

  async function moveExercise(index: number, direction: "up" | "down") {
    const newOrder = [...exercises];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newOrder.length) return;
    [newOrder[index], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[index]];
    setExercises(newOrder);
    try {
      const result = await reorderTemplateExercisesAction(
        template.id,
        newOrder.map((e) => e.id)
      );
      if (result?.error) {
        toast.error(result.error);
        setExercises(template.exercises);
        return;
      }
      if (result?.redirectTo) {
        router.push(result.redirectTo);
        return;
      }
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err) || "Could not save order.";
      toast.error(message.trim() || "Could not save order. Try duplicating the routine first (edit name and save), then reorder.");
      setExercises(template.exercises);
    }
  }

  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto pb-8">
      <div className="flex gap-4 mb-6">
        <Link href="/templates" className="flex-shrink-0">
          <Button variant="ghost" size="icon" className="rounded-full shadow-neu-extruded active:shadow-neu-pressed h-12 w-12">
            <ChevronLeft className="h-6 w-6 text-primary" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          {editingName ? (
            <div className="flex flex-col gap-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveName()}
                  className="flex-1 min-w-0 px-4 py-3 rounded-2xl bg-card border border-border text-lg font-bold min-h-[48px] touch-manipulation"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" className="rounded-full" onClick={saveName}>
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-full" onClick={() => { setEditingName(false); setEditName(template.name); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditingName(true)}
              className="w-full text-left p-3 rounded-2xl border border-dashed border-border/60 hover:border-primary/60 hover:bg-card/50 transition-colors group"
            >
              <div className="flex items-start gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight break-words flex-1">{template.name}</h1>
                <Pencil className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" aria-hidden />
              </div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1 block">Tap to edit</span>
            </button>
          )}
        </div>
      </div>
      {(editingDesc || template.description) && (
        <div className="px-2">
          {editingDesc ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <input
                type="text"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Description (optional)"
                className="flex-1 min-w-0 px-4 py-3 rounded-2xl bg-card border border-border text-sm min-h-[48px] touch-manipulation"
                onKeyDown={(e) => e.key === "Enter" && saveDescription()}
              />
              <div className="flex gap-2">
                <Button size="sm" className="rounded-full" onClick={saveDescription}>
                  Save
                </Button>
                <Button size="sm" variant="ghost" className="rounded-full" onClick={() => { setEditingDesc(false); setEditDescription(template.description ?? ""); }}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditingDesc(true)}
              className="w-full text-left p-3 rounded-2xl border border-dashed border-border/60 hover:border-primary/60 hover:bg-card/50 transition-colors flex items-center gap-2"
            >
              <span className="text-sm text-muted-foreground flex-1 break-words">{template.description || "Add description"}</span>
              <Pencil className="h-3.5 w-3.5 text-primary flex-shrink-0" aria-hidden />
            </button>
          )}
        </div>
      )}
      {!editingDesc && !template.description && (
        <button
          type="button"
          onClick={() => setEditingDesc(true)}
          className="w-full text-left p-3 rounded-2xl border border-dashed border-border/60 hover:border-primary/60 text-xs text-muted-foreground hover:text-foreground flex items-center gap-2"
        >
          <span>+ Add description</span>
          <Pencil className="h-3.5 w-3.5 text-primary flex-shrink-0" aria-hidden />
        </button>
      )}

      <div className="flex justify-center py-2">
        <Button
          size="icon-lg"
          className="rounded-full h-[88px] w-[88px] shadow-[0_0_20px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_25px_hsl(var(--primary)/0.6)] animate-pulse-slow"
          onClick={() => setShowConfirmDialog(true)}
        >
          <Play className="h-10 w-10 ml-1" />
        </Button>
      </div>

      <div className="space-y-2">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2 px-1">
          <Calendar className="h-3.5 w-3.5" />
          Scheduled days
        </h2>
        <div className="p-3 rounded-2xl bg-card shadow-neu-extruded">
          <div className="flex flex-wrap gap-1.5 justify-center">
            {DAY_LABELS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => toggleDay(value)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all duration-200 ${
                  scheduledDays.includes(value)
                    ? "bg-primary text-primary-foreground shadow-neu-extruded drop-shadow-[0_0_5px_rgba(255,100,0,0.5)]"
                    : "text-muted-foreground shadow-neu-inset bg-card active:scale-95"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Exercises</h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-full gap-1 text-primary h-10 px-4 min-h-[40px] touch-manipulation"
            onClick={() => setAddExerciseOpen(true)}
          >
            <Plus className="h-4 w-4 flex-shrink-0" />
            Add exercise
          </Button>
        </div>
        <div className="p-4 rounded-3xl bg-card shadow-neu-extruded space-y-4">
          {exercises.map((te, i) => (
            <motion.div
              key={te.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4 p-5 rounded-2xl shadow-neu-inset bg-card group"
            >
              <div className="flex flex-col gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground disabled:opacity-30 touch-manipulation min-h-[36px] min-w-[36px]"
                  onClick={() => moveExercise(i, "up")}
                  disabled={i === 0}
                  aria-label="Move up"
                >
                  <ChevronUp className="h-5 w-5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground disabled:opacity-30 touch-manipulation min-h-[36px] min-w-[36px]"
                  onClick={() => moveExercise(i, "down")}
                  disabled={i === exercises.length - 1}
                  aria-label="Move down"
                >
                  <ChevronDown className="h-5 w-5" />
                </Button>
              </div>
              <div className="flex-1 min-w-0">
                {editingExerciseId === te.id ? (
                  <div className="flex flex-col gap-3 w-full">
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-1">
                      Editing exercise name
                    </label>
                    <input
                      type="text"
                      value={editExerciseName}
                      onChange={(e) => setEditExerciseName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveExerciseName()}
                      className="w-full px-4 py-3 rounded-xl bg-card border border-primary/30 text-sm font-bold min-h-[48px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Exercise name"
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <Button size="sm" className="rounded-full h-9 px-4 min-h-[36px] touch-manipulation" onClick={saveExerciseName}>
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-full h-9 px-4 min-h-[36px] touch-manipulation"
                        onClick={() => {
                          setEditingExerciseId(null);
                          setEditExerciseName("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : editingExerciseDetails === te.id ? (
                  <div className="space-y-3">
                    <p className="font-bold text-lg leading-tight break-words">
                      {te.display_name ?? te.exercise.name}
                    </p>
                    <div className="space-y-2">
                      {(te.sets ?? []).map((set, idx) => (
                        <div
                          key={set.id}
                          className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-card shadow-neu-inset"
                        >
                          {editingSetId === set.id ? (
                            <>
                              <span className="text-xs text-muted-foreground w-8">Set {idx + 1}</span>
                              <input
                                type="number"
                                min={1}
                                max={100}
                                value={editRepsMin ?? ""}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setEditRepsMin(v === "" ? null : parseInt(v, 10) || null);
                                }}
                                placeholder="Min"
                                className="w-12 h-9 rounded-lg shadow-neu-inset bg-card border-0 text-center text-sm font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                              />
                              <span className="text-muted-foreground">–</span>
                              <input
                                type="number"
                                min={1}
                                max={100}
                                value={editRepsMax ?? ""}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setEditRepsMax(v === "" ? null : parseInt(v, 10) || null);
                                }}
                                placeholder="Max"
                                className="w-12 h-9 rounded-lg shadow-neu-inset bg-card border-0 text-center text-sm font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                              />
                              <input
                                type="number"
                                min={0}
                                step={0.5}
                                value={editWeight ?? ""}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setEditWeight(v === "" ? null : parseFloat(v) || null);
                                }}
                                placeholder="kg"
                                className="w-12 h-9 rounded-lg shadow-neu-inset bg-card border-0 text-center text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                              />
                              <div className="flex flex-wrap items-center gap-1">
                                {PRESET_TAGS.map(({ value, label }) => (
                                  <button
                                    key={value}
                                    type="button"
                                    onClick={() => setEditTag(value)}
                                    className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${
                                      editTag === value
                                        ? "bg-primary text-primary-foreground shadow-neu-extruded drop-shadow-[0_0_5px_rgba(255,100,0,0.5)]"
                                        : "bg-card shadow-neu-inset text-muted-foreground hover:text-foreground"
                                    }`}
                                  >
                                    {label}
                                  </button>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => setEditTag(isPresetTag(editTag) ? "" : editTag)}
                                  className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${
                                    !isPresetTag(editTag)
                                      ? "bg-primary text-primary-foreground shadow-neu-extruded drop-shadow-[0_0_5px_rgba(255,100,0,0.5)]"
                                      : "bg-card shadow-neu-inset text-muted-foreground hover:text-foreground"
                                  }`}
                                >
                                  Custom
                                </button>
                                {!isPresetTag(editTag) && (
                                  <input
                                    type="text"
                                    value={editTag}
                                    onChange={(e) => setEditTag(e.target.value)}
                                    placeholder="e.g. drop set"
                                    className="w-24 h-8 px-2 rounded-lg shadow-neu-inset bg-card border-0 text-[11px] font-medium uppercase focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    maxLength={32}
                                  />
                                )}
                              </div>
                              <Button size="sm" className="rounded-full h-9 px-3" onClick={saveSetEdits}>
                                Save
                              </Button>
                              <Button size="sm" variant="ghost" className="rounded-full h-9 px-3" onClick={() => setEditingSetId(null)}>
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <span className="text-xs text-muted-foreground w-8">Set {idx + 1}</span>
                              <span className="text-sm font-medium">
                                {set.reps_min != null && set.reps_max != null
                                  ? `${set.reps_min}–${set.reps_max} reps`
                                  : set.reps_min != null
                                    ? `${set.reps_min} reps`
                                    : "? reps"}
                                {set.weight_kg != null && set.weight_kg > 0 && ` · ${set.weight_kg} kg`}
                              </span>
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                set.tag === "warmup" ? "bg-primary/20 text-primary" : "bg-card text-muted-foreground"
                              }`}>
                                {set.tag}
                              </span>
                              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => startEditingSet(set)} aria-label="Edit set">
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-destructive hover:text-destructive" onClick={() => handleRemoveSet(set.id, te.id)} aria-label="Remove set">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-full h-9 px-4 gap-1"
                          onClick={() => handleAddSet(te.id)}
                          disabled={addingSetForTeId === te.id}
                        >
                          {addingSetForTeId === te.id ? (
                            <span className="flex items-center gap-1">Adding…</span>
                          ) : (
                            <>
                              <Plus className="h-4 w-4" />
                              Add set
                            </>
                          )}
                        </Button>
                        <Button size="sm" variant="ghost" className="rounded-full h-9 px-4" onClick={() => setEditingExerciseDetails(null)}>
                          Done
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingExerciseId(te.id);
                        setEditExerciseName(te.display_name ?? te.exercise.name);
                      }}
                      className="text-left w-full group/name touch-manipulation"
                    >
                      <p className="font-bold text-lg leading-tight break-words group-hover/name:text-primary transition-colors py-1">
                        {te.display_name ?? te.exercise.name}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => startEditingDetails(te)}
                      className="text-left w-full touch-manipulation space-y-1.5"
                    >
                      {(te.sets ?? []).length === 0 ? (
                        <p className="text-xs font-medium text-primary tracking-wide uppercase py-2 px-3 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors inline-block">
                          No sets — tap to add
                        </p>
                      ) : (
                        (te.sets ?? []).map((set, idx) => (
                          <p key={set.id} className="text-xs font-medium text-primary tracking-wide uppercase py-2 px-3 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors inline-block mr-2 mb-1">
                            {idx + 1} SET × {set.reps_min != null && set.reps_max != null ? `${set.reps_min}–${set.reps_max}` : set.reps_min ?? "?"} REPS
                            {set.weight_kg != null && set.weight_kg > 0 && ` · ${set.weight_kg} kg`}
                            {" "}({set.tag.toUpperCase()})
                          </p>
                        ))
                      )}
                    </button>
                  </div>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-11 w-11 rounded-full text-muted-foreground hover:text-destructive opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity touch-manipulation min-h-[44px] min-w-[44px] flex-shrink-0"
                onClick={() => removeExercise(te.id)}
                aria-label="Remove exercise"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </motion.div>
          ))}
          {exercises.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No exercises added. Click &quot;Add exercise&quot; to build your routine.
            </p>
          )}
        </div>
      </div>

      <Dialog open={addExerciseOpen} onOpenChange={setAddExerciseOpen}>
        <DialogContent className="rounded-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add exercise</DialogTitle>
            <DialogDescription>
              Choose an exercise to add to this routine.
            </DialogDescription>
          </DialogHeader>
          <input
            type="search"
            value={exerciseSearch}
            onChange={(e) => setExerciseSearch(e.target.value)}
            placeholder="Search exercises..."
            className="w-full px-4 py-3 rounded-2xl bg-card border border-border text-foreground"
          />
          <div className="overflow-y-auto flex-1 min-h-0 space-y-1 -mx-2 px-2">
            {availableExercises.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {exerciseSearch ? "No matching exercises." : "All exercises are already in this routine."}
              </p>
            )}
            {availableExercises.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => addExercise(ex.id)}
                className="w-full text-left px-4 py-3 rounded-2xl bg-card shadow-neu-inset hover:shadow-neu-extruded transition-all"
              >
                <span className="font-medium">{ex.name}</span>
                {ex.equipment && (
                  <span className="text-xs text-muted-foreground ml-2">
                    {ex.equipment}
                  </span>
                )}
              </button>
            ))}
            <div className="pt-4 border-t border-border mt-4">
              <button
                type="button"
                onClick={() => setCreateCustomOpen(true)}
                className="w-full text-left px-4 py-3 rounded-2xl bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-all"
              >
                + Create custom exercise
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createCustomOpen} onOpenChange={setCreateCustomOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Create custom exercise</DialogTitle>
            <DialogDescription>
              Add a new exercise to your library. It will be added to this routine.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">
                Exercise name
              </label>
              <input
                type="text"
                value={customExerciseName}
                onChange={(e) => setCustomExerciseName(e.target.value)}
                placeholder="e.g. Cable Fly"
                className="w-full px-4 py-3 rounded-2xl bg-card border border-border shadow-neu-inset text-foreground"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">
                Equipment (optional)
              </label>
              <input
                type="text"
                value={customExerciseEquipment}
                onChange={(e) => setCustomExerciseEquipment(e.target.value)}
                placeholder="e.g. Cable, Dumbbell"
                className="w-full px-4 py-3 rounded-2xl bg-card border border-border shadow-neu-inset text-foreground"
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:flex-row">
            <Button variant="outline" className="rounded-full" onClick={() => setCreateCustomOpen(false)}>
              Cancel
            </Button>
            <Button
              className="rounded-full"
              onClick={handleCreateCustomExercise}
              disabled={!customExerciseName.trim()}
            >
              Create & add to routine
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Start Workout Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Ready to Workout?</DialogTitle>
            <DialogDescription className="text-sm">
              Review today&apos;s exercises before starting the timer.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 max-h-[50vh] overflow-y-auto scrollbar-neu">
            <h3 className="font-bold text-lg mb-3 px-1">{template.name}</h3>
            <div className="space-y-2">
              {exercises.map((te, i) => (
                <div key={te.id} className="flex items-center gap-3 p-3 rounded-2xl bg-card/50 shadow-neu-inset">
                  <div className="h-7 w-7 rounded-full shadow-neu-extruded flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {te.display_name ?? te.exercise.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(te.sets ?? []).length} set{(te.sets ?? []).length !== 1 ? "s" : ""}
                      {(te.sets ?? []).length > 0 && (te.sets ?? [])[0] && ` × ${(te.sets ?? [])[0].reps_min ?? "?"}${(te.sets ?? [])[0].reps_max && (te.sets ?? [])[0].reps_max !== (te.sets ?? [])[0].reps_min ? `-${(te.sets ?? [])[0].reps_max}` : ""} reps`}
                      {(te.sets ?? [])[0]?.tag === "warmup" && " (warmup)"}
                    </p>
                  </div>
                </div>
              ))}
              {exercises.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No exercises configured for this workout.
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
            <Button
              variant="outline"
              className="rounded-full h-12 flex-1 touch-manipulation min-h-[48px]"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isStarting}
            >
              Cancel
            </Button>
            <Button
              className="rounded-full h-12 flex-1 touch-manipulation min-h-[48px]"
              onClick={handleStartWorkout}
              disabled={isStarting || exercises.length === 0}
            >
              {isStarting ? (
                <>
                  <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Confirm & start
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
