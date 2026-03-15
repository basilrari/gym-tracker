"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, parseISO, subDays } from "date-fns";
import {
  ChevronRight,
  Pencil,
  Trash2,
  Copy,
  Calendar,
  Dumbbell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  updateWorkoutAction,
  deleteWorkoutFromForm,
} from "@/app/actions/end-workout";
import {
  createTemplateFromWorkoutAction,
  addWorkoutToTemplateAction,
} from "@/app/actions/templates";
import type { Workout } from "@/lib/db/types";
import type { WorkoutTemplate } from "@/lib/db/types";

type Range = "7d" | "30d" | "all";

type HistoryClientProps = {
  workouts: Workout[];
  templates: WorkoutTemplate[];
};

function formatDuration(start: string, end: string | null): string {
  if (!end) return "—";
  const a = parseISO(start).getTime();
  const b = parseISO(end).getTime();
  const min = Math.round((b - a) / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function HistoryClient({ workouts, templates }: HistoryClientProps) {
  const router = useRouter();
  const [range, setRange] = useState<Range>("30d");
  const [editWorkout, setEditWorkout] = useState<Workout | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteWorkout, setDeleteWorkout] = useState<Workout | null>(null);
  const [saveAsTemplateWorkout, setSaveAsTemplateWorkout] =
    useState<Workout | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [addToTemplateId, setAddToTemplateId] = useState<string>("");

  const filtered = useMemo(() => {
    if (range === "all") return workouts;
    const from = subDays(new Date(), range === "7d" ? 7 : 30);
    return workouts.filter((w) => new Date(w.start_time) >= from);
  }, [workouts, range]);

  const handleEdit = (w: Workout) => {
    setEditWorkout(w);
    setEditName(w.name);
  };

  const handleSaveEdit = async () => {
    if (!editWorkout) return;
    await updateWorkoutAction(editWorkout.id, editName);
    setEditWorkout(null);
    router.refresh();
  };

  const handleSaveAsTemplate = async () => {
    if (!saveAsTemplateWorkout) return;
    if (addToTemplateId) {
      await addWorkoutToTemplateAction(saveAsTemplateWorkout.id, addToTemplateId);
    } else {
      await createTemplateFromWorkoutAction(
        saveAsTemplateWorkout.id,
        templateName || saveAsTemplateWorkout.name
      );
    }
    setSaveAsTemplateWorkout(null);
    setTemplateName("");
    setAddToTemplateId("");
  };

  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto pb-8">
      <div className="text-center space-y-1 mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          History
        </h1>
        <p className="text-muted-foreground text-xs uppercase tracking-wider">
          Past workouts
        </p>
      </div>

      <div className="flex gap-2 justify-center">
        {(["7d", "30d", "all"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              range === r
                ? "bg-primary text-primary-foreground shadow-neu-pressed"
                : "bg-card shadow-neu-inset text-muted-foreground hover:text-foreground"
            }`}
          >
            {r === "all" ? "All" : r === "7d" ? "7 days" : "30 days"}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="p-8 rounded-3xl shadow-neu-inset text-center text-sm text-muted-foreground">
            No completed workouts in this period.
          </div>
        )}
        {filtered.map((w) => (
          <div
            key={w.id}
            className="flex items-center gap-4 p-5 rounded-3xl bg-card shadow-neu-extruded"
          >
            <Link
              href={`/workout/${w.id}/complete`}
              className="flex-1 flex flex-col gap-1 min-w-0"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg break-words">{w.name}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {format(parseISO(w.start_time), "MMM d, yyyy")}
                </span>
                <span>{formatDuration(w.start_time, w.end_time)}</span>
                {w.total_volume_kg != null && w.total_volume_kg > 0 && (
                  <span>{Math.round(w.total_volume_kg)} kg volume</span>
                )}
              </div>
            </Link>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={() => handleEdit(w)}
                aria-label="Edit name"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full text-destructive hover:text-destructive"
                onClick={() => setDeleteWorkout(w)}
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={() => {
                  setSaveAsTemplateWorkout(w);
                  setTemplateName(w.name);
                  setAddToTemplateId("");
                }}
                aria-label="Save as template"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit name dialog */}
      <Dialog open={!!editWorkout} onOpenChange={(o) => !o && setEditWorkout(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Edit workout name</DialogTitle>
            <DialogDescription>
              Change the name of this workout in your history.
            </DialogDescription>
          </DialogHeader>
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl bg-card border border-border shadow-neu-inset text-foreground"
            placeholder="Workout name"
          />
          <DialogFooter className="flex gap-2 sm:flex-row">
            <Button variant="outline" className="rounded-full" onClick={() => setEditWorkout(null)}>
              Cancel
            </Button>
            <Button className="rounded-full" onClick={handleSaveEdit}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteWorkout} onOpenChange={(o) => !o && setDeleteWorkout(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Delete this workout?</DialogTitle>
            <DialogDescription>
              It will be removed from your history. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:flex-row">
            <Button variant="outline" className="rounded-full" onClick={() => setDeleteWorkout(null)}>
              Cancel
            </Button>
            {deleteWorkout && (
              <form action={deleteWorkoutFromForm}>
                <input type="hidden" name="workoutId" value={deleteWorkout.id} />
                <Button type="submit" variant="destructive" className="rounded-full">
                  Delete
                </Button>
              </form>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save as template / Add to template */}
      <Dialog
        open={!!saveAsTemplateWorkout}
        onOpenChange={(o) => {
          if (!o) {
            setSaveAsTemplateWorkout(null);
            setTemplateName("");
            setAddToTemplateId("");
          }
        }}
      >
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Save workout as routine</DialogTitle>
            <DialogDescription>
              Create a new routine from this workout, or add its exercises to an
              existing routine.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">
                Add to existing routine
              </label>
              <select
                value={addToTemplateId}
                onChange={(e) => setAddToTemplateId(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-card border border-border shadow-neu-inset text-foreground"
              >
                <option value="">— New routine —</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            {!addToTemplateId && (
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">
                  New routine name
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-card border border-border shadow-neu-inset text-foreground"
                  placeholder="Routine name"
                />
              </div>
            )}
          </div>
          <DialogFooter className="flex gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => {
                setSaveAsTemplateWorkout(null);
                setTemplateName("");
                setAddToTemplateId("");
              }}
            >
              Cancel
            </Button>
            <Button className="rounded-full" onClick={handleSaveAsTemplate}>
              <Dumbbell className="h-4 w-4 mr-2" />
              {addToTemplateId ? "Add to routine" : "Create routine"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
