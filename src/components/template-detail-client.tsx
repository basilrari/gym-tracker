"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import type { TemplateWithExercises } from "@/lib/db/types";
import type { Exercise } from "@/lib/db/types";
import { updateTemplateAction, addTemplateExerciseAction, removeTemplateExerciseAction, reorderTemplateExercisesAction, updateTemplateExerciseAction } from "@/app/actions/templates";
import { createExerciseAction } from "@/app/actions/exercises";

const DAY_LABELS: { value: number; label: string }[] = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" },
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
  const [editTargetSets, setEditTargetSets] = useState(1);
  const [editTargetRepsMin, setEditTargetRepsMin] = useState<number | null>(null);
  const [editTargetRepsMax, setEditTargetRepsMax] = useState<number | null>(null);
  const [editIsWarmup, setEditIsWarmup] = useState(false);

  async function toggleDay(day: number) {
    const next = scheduledDays.includes(day)
      ? scheduledDays.filter((d) => d !== day)
      : [...scheduledDays, day].sort((a, b) => a - b);
    setScheduledDays(next);
    await updateTemplateAction(template.id, { scheduled_days: next });
  }

  async function saveName() {
    const name = editName.trim() || template.name;
    await updateTemplateAction(template.id, { name });
    setEditName(name);
    setEditingName(false);
    router.refresh();
  }

  async function saveDescription() {
    await updateTemplateAction(template.id, {
      description: editDescription.trim() || null,
    });
    setEditingDesc(false);
    router.refresh();
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
    await updateTemplateExerciseAction(editingExerciseId, {
      display_name: editExerciseName.trim() || null,
    });
    setExercises((prev) =>
      prev.map((e) =>
        e.id === editingExerciseId
          ? { ...e, display_name: editExerciseName.trim() || null }
          : e
      )
    );
    setEditingExerciseId(null);
    router.refresh();
  }

  async function saveExerciseDetails() {
    if (!editingExerciseDetails) return;
    await updateTemplateExerciseAction(editingExerciseDetails, {
      target_sets: editTargetSets,
      target_reps_min: editTargetRepsMin ?? undefined,
      target_reps_max: editTargetRepsMax ?? undefined,
      is_warmup: editIsWarmup,
    });
    setExercises((prev) =>
      prev.map((e) =>
        e.id === editingExerciseDetails
          ? { 
              ...e, 
              target_sets: editTargetSets,
              target_reps_min: editTargetRepsMin,
              target_reps_max: editTargetRepsMax,
              is_warmup: editIsWarmup,
            }
          : e
      )
    );
    setEditingExerciseDetails(null);
    router.refresh();
  }

  function startEditingDetails(te: typeof exercises[0]) {
    setEditingExerciseDetails(te.id);
    setEditTargetSets(te.target_sets);
    setEditTargetRepsMin(te.target_reps_min);
    setEditTargetRepsMax(te.target_reps_max);
    setEditIsWarmup(te.is_warmup);
  }

  async function moveExercise(index: number, direction: "up" | "down") {
    const newOrder = [...exercises];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newOrder.length) return;
    [newOrder[index], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[index]];
    setExercises(newOrder);
    await reorderTemplateExercisesAction(
      template.id,
      newOrder.map((e) => e.id)
    );
    router.refresh();
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
          onClick={() => startWorkoutAction(template.id, template.name)}
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="text"
                      value={editExerciseName}
                      onChange={(e) => setEditExerciseName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveExerciseName()}
                      className="flex-1 min-w-0 px-4 py-3 rounded-xl bg-card border border-border text-sm font-bold min-h-[48px] touch-manipulation"
                      autoFocus
                    />
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
                ) : editingExerciseDetails === te.id ? (
                  <div className="space-y-3">
                    <p className="font-bold text-lg leading-tight break-words">
                      {te.display_name ?? te.exercise.name}
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Sets</span>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={editTargetSets}
                          onChange={(e) => setEditTargetSets(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-16 h-11 rounded-lg shadow-neu-inset bg-card border-0 text-center text-base font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[44px] touch-manipulation"
                        />
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Reps</span>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={editTargetRepsMin ?? ""}
                          onChange={(e) => setEditTargetRepsMin(e.target.value ? parseInt(e.target.value) : null)}
                          placeholder="Min"
                          className="w-16 h-11 rounded-lg shadow-neu-inset bg-card border-0 text-center text-base font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[44px] touch-manipulation"
                        />
                        <span className="text-muted-foreground">–</span>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={editTargetRepsMax ?? ""}
                          onChange={(e) => setEditTargetRepsMax(e.target.value ? parseInt(e.target.value) : null)}
                          placeholder="Max"
                          className="w-16 h-11 rounded-lg shadow-neu-inset bg-card border-0 text-center text-base font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[44px] touch-manipulation"
                        />
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px]">
                        <input
                          type="checkbox"
                          checked={editIsWarmup}
                          onChange={(e) => setEditIsWarmup(e.target.checked)}
                          className="w-5 h-5 rounded border-border text-primary focus:ring-primary/50 min-h-[20px] min-w-[20px]"
                        />
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Warmup</span>
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="rounded-full h-9 px-4 min-h-[36px] touch-manipulation" onClick={saveExerciseDetails}>
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-full h-9 px-4 min-h-[36px] touch-manipulation"
                        onClick={() => setEditingExerciseDetails(null)}
                      >
                        Cancel
                      </Button>
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
                      className="text-left w-full touch-manipulation"
                    >
                      <p className="text-xs font-medium text-primary tracking-wide uppercase py-2 px-3 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors inline-block">
                        {te.target_sets} SETS × {te.target_reps_min ?? "?"}{te.target_reps_max && te.target_reps_max !== te.target_reps_min ? `–${te.target_reps_max}` : ""} REPS
                        {te.is_warmup && " (WARMUP)"}
                      </p>
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
    </div>
  );
}
