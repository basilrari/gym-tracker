"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Play, ChevronLeft, GripVertical, Calendar, Pencil, Plus, Trash2 } from "lucide-react";
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
import { updateTemplateAction, addTemplateExerciseAction, removeTemplateExerciseAction } from "@/app/actions/templates";
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

  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto pb-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/templates">
          <Button variant="ghost" size="icon" className="rounded-full shadow-neu-extruded active:shadow-neu-pressed h-12 w-12">
            <ChevronLeft className="h-6 w-6 text-primary" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveName()}
                className="flex-1 min-w-0 px-3 py-2 rounded-2xl bg-card border border-border text-lg font-bold"
                autoFocus
              />
              <Button size="sm" className="rounded-full" onClick={saveName}>
                Save
              </Button>
              <Button size="sm" variant="ghost" className="rounded-full" onClick={() => { setEditingName(false); setEditName(template.name); }}>
                Cancel
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditingName(true)}
              className="flex items-center gap-2 w-full text-left group"
            >
              <h1 className="text-2xl font-bold tracking-tight truncate">{template.name}</h1>
              <Pencil className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 flex-shrink-0" />
            </button>
          )}
        </div>
      </div>
      {(editingDesc || template.description) && (
        <div className="px-2">
          {editingDesc ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Description (optional)"
                className="flex-1 min-w-0 px-3 py-2 rounded-2xl bg-card border border-border text-sm"
                onKeyDown={(e) => e.key === "Enter" && saveDescription()}
              />
              <Button size="sm" className="rounded-full" onClick={saveDescription}>
                Save
              </Button>
              <Button size="sm" variant="ghost" className="rounded-full" onClick={() => { setEditingDesc(false); setEditDescription(template.description ?? ""); }}>
                Cancel
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditingDesc(true)}
              className="text-sm text-muted-foreground hover:text-foreground text-left flex items-center gap-2 group w-full"
            >
              <span className="truncate">{template.description || "Add description"}</span>
              <Pencil className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 flex-shrink-0" />
            </button>
          )}
        </div>
      )}
      {!editingDesc && !template.description && (
        <button
          type="button"
          onClick={() => setEditingDesc(true)}
          className="text-xs text-muted-foreground hover:text-foreground px-2"
        >
          + Add description
        </button>
      )}

      <div className="flex justify-center py-4">
        <Button
          size="icon-lg"
          className="rounded-full h-[88px] w-[88px] shadow-[0_0_20px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_25px_hsl(var(--primary)/0.6)] animate-pulse-slow"
          onClick={() => startWorkoutAction(template.id, template.name)}
        >
          <Play className="h-10 w-10 ml-1" />
        </Button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Scheduled days
          </h2>
        </div>
        <div className="p-5 rounded-3xl bg-card shadow-neu-extruded">
          <div className="flex flex-wrap gap-2 justify-center">
            {DAY_LABELS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => toggleDay(value)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 ${
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
            className="rounded-full gap-1 text-primary"
            onClick={() => setAddExerciseOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add exercise
          </Button>
        </div>
        <div className="p-4 rounded-3xl bg-card shadow-neu-extruded space-y-3">
          {exercises.map((te, i) => (
            <motion.div
              key={te.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-4 rounded-2xl shadow-neu-inset bg-card group"
            >
              <GripVertical className="h-5 w-5 text-muted-foreground/50 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-lg leading-tight truncate">{te.exercise.name}</p>
                <p className="text-xs font-medium text-primary mt-1 tracking-wide uppercase">
                  {te.target_sets} SETS × {te.target_reps_min ?? "?"}–{te.target_reps_max ?? "?"} REPS
                  {te.is_warmup && " (WARMUP)"}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeExercise(te.id)}
                aria-label="Remove exercise"
              >
                <Trash2 className="h-4 w-4" />
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
