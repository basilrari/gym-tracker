"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  format,
  parseISO,
  subDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Copy,
  Calendar,
  Dumbbell,
  ExternalLink,
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
import { getWorkoutHistoryDetailAction } from "@/app/actions/history";
import type { Workout, WorkoutSet } from "@/lib/db/types";
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

function epley1rm(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return weight;
  return Math.round((weight * (1 + reps / 30)) * 10) / 10;
}

export function HistoryClient({ workouts, templates }: HistoryClientProps) {
  const router = useRouter();
  const [range, setRange] = useState<Range>("30d");
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [detailWorkout, setDetailWorkout] = useState<Workout | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailSets, setDetailSets] = useState<WorkoutSet[]>([]);
  const [detailNames, setDetailNames] = useState<Record<number, string>>({});
  const [detailOrder, setDetailOrder] = useState<number[] | null>(null);

  const [editWorkout, setEditWorkout] = useState<Workout | null>(null);
  const [editName, setEditName] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [deleteWorkout, setDeleteWorkout] = useState<Workout | null>(null);
  const [saveAsTemplateWorkout, setSaveAsTemplateWorkout] = useState<Workout | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [addToTemplateId, setAddToTemplateId] = useState<string>("");
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    let list = workouts;
    if (range === "7d") {
      const from = subDays(new Date(), 7);
      list = list.filter((w) => new Date(w.start_time) >= from);
    } else if (range === "30d") {
      const from = subDays(new Date(), 30);
      list = list.filter((w) => new Date(w.start_time) >= from);
    }
    if (selectedDay) {
      const key = format(selectedDay, "yyyy-MM-dd");
      list = list.filter((w) => w.start_time.slice(0, 10) === key);
    }
    return list;
  }, [workouts, range, selectedDay]);

  const daysWithWorkouts = useMemo(() => {
    const s = new Set<string>();
    for (const w of workouts) {
      if (w.end_time) s.add(w.start_time.slice(0, 10));
    }
    return s;
  }, [workouts]);

  const calendarDays = useMemo(() => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    return eachDayOfInterval({ start, end });
  }, [month]);

  const openDetail = (w: Workout) => {
    setDetailWorkout(w);
    setDetailLoading(true);
    setDetailSets([]);
    setDetailNames({});
    setDetailOrder(null);
    void getWorkoutHistoryDetailAction(w.id).then((res) => {
      setDetailLoading(false);
      if (!res) return;
      setDetailSets(res.workout.sets);
      setDetailNames(res.exerciseNames);
      const ord = res.workout.sessionExerciseLogOrder?.map((e) => e.exerciseId) ?? null;
      setDetailOrder(ord);
    });
  };

  const groupedSets = useMemo(() => {
    const byEx = new Map<number, WorkoutSet[]>();
    for (const s of detailSets) {
      const arr = byEx.get(s.exercise_id) ?? [];
      arr.push(s);
      byEx.set(s.exercise_id, arr);
    }
    for (const arr of byEx.values()) arr.sort((a, b) => a.set_index - b.set_index);
    let order = detailOrder ?? [...byEx.keys()].sort((a, b) => a - b);
    if (detailOrder) {
      order = detailOrder.filter((id) => byEx.has(id));
      for (const id of byEx.keys()) {
        if (!order.includes(id)) order.push(id);
      }
    }
    return order.map((id) => ({ exerciseId: id, sets: byEx.get(id) ?? [] }));
  }, [detailSets, detailOrder]);

  const handleSaveEdit = () => {
    if (!editWorkout) return;
    startTransition(async () => {
      await updateWorkoutAction(editWorkout.id, editName, editNotes);
      setEditWorkout(null);
      router.refresh();
    });
  };

  const handleSaveAsTemplate = () => {
    if (!saveAsTemplateWorkout) return;
    startTransition(async () => {
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
    });
  };

  const isSession = (w: Workout) => w.source === "session";

  return (
    <div className="px-4 py-6 space-y-6 max-w-mobile mx-auto w-full pb-28">
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="text-center space-y-1"
      >
        <h1 className="text-2xl font-bold tracking-tight">History</h1>
        <p className="text-muted-foreground text-xs uppercase tracking-wider">Past workouts</p>
      </motion.div>

      <div className="flex gap-2 justify-center flex-wrap">
        {(["7d", "30d", "all"] as const).map((r) => (
          <motion.button
            key={r}
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              setRange(r);
              setSelectedDay(null);
            }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
              range === r
                ? "bg-primary text-primary-foreground border-primary shadow-[0_0_16px_hsl(var(--primary)/0.35)]"
                : "glass-panel border-white/15 text-muted-foreground"
            }`}
          >
            {r === "all" ? "All" : r === "7d" ? "7 days" : "30 days"}
          </motion.button>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-4 space-y-3"
      >
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full h-9 w-9"
            onClick={() => setMonth((m) => addMonths(m, -1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="text-sm font-bold">{format(month, "MMMM yyyy")}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full h-9 w-9"
            onClick={() => setMonth((m) => addMonths(m, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase text-muted-foreground font-semibold">
          {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {(() => {
            const first = calendarDays[0];
            const pad = first ? (first.getDay() + 6) % 7 : 0;
            const cells: (Date | null)[] = [...Array(pad).fill(null), ...calendarDays];
            return cells.map((d, i) => {
              if (!d) return <div key={`e-${i}`} className="aspect-square" />;
              const key = format(d, "yyyy-MM-dd");
              const hit = daysWithWorkouts.has(key);
              const sel = selectedDay && isSameDay(d, selectedDay);
              const inM = isSameMonth(d, month);
              return (
                <motion.button
                  key={key}
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setSelectedDay((prev) => (prev && isSameDay(prev, d) ? null : d))}
                  className={`aspect-square rounded-xl text-xs font-semibold border transition-colors ${
                    !inM ? "opacity-30" : ""
                  } ${sel ? "border-primary bg-primary/20 text-primary" : "border-white/10 bg-background/20"} ${
                    hit ? "ring-1 ring-primary/40" : ""
                  }`}
                >
                  {format(d, "d")}
                </motion.button>
              );
            });
          })()}
        </div>
        {selectedDay && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full rounded-full text-xs"
            onClick={() => setSelectedDay(null)}
          >
            Clear day filter
          </Button>
        )}
      </motion.div>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-8 rounded-3xl glass-panel text-center text-sm text-muted-foreground"
            >
              No workouts match this view.
            </motion.div>
          )}
          {filtered.map((w, idx) => (
            <motion.div
              key={w.id}
              layout
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.03, type: "spring", stiffness: 380, damping: 28 }}
              className="flex items-stretch gap-2 p-3 rounded-3xl glass-panel"
            >
              <button
                type="button"
                onClick={() => openDetail(w)}
                className="flex-1 flex flex-col gap-1 min-w-0 text-left touch-manipulation"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-base break-words">{w.name}</span>
                  {!isSession(w) && (
                    <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground">
                      Classic
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(parseISO(w.start_time), "MMM d, yyyy")}
                  </span>
                  <span>{formatDuration(w.start_time, w.end_time)}</span>
                  {w.total_volume_kg != null && w.total_volume_kg > 0 && (
                    <span>{Math.round(Number(w.total_volume_kg))} kg</span>
                  )}
                </div>
              </button>
              <div className="flex flex-col gap-1 flex-shrink-0 justify-center">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" asChild>
                  <Link href={`/workout/${w.id}/complete`} aria-label="Open summary">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </Button>
                {isSession(w) && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={() => {
                        setEditWorkout(w);
                        setEditName(w.name);
                        setEditNotes(w.notes ?? "");
                      }}
                      aria-label="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full text-destructive"
                      onClick={() => setDeleteWorkout(w)}
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => {
                    setSaveAsTemplateWorkout(w);
                    setTemplateName(w.name);
                    setAddToTemplateId("");
                  }}
                  aria-label="Save as template"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Detail drawer */}
      <Dialog open={!!detailWorkout} onOpenChange={(o) => !o && setDetailWorkout(null)}>
        <DialogContent className="rounded-3xl glass-panel border-white/20 max-h-[90vh] overflow-y-auto max-w-mobile w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle className="pr-8">{detailWorkout?.name}</DialogTitle>
            <DialogDescription>
              {detailWorkout && format(parseISO(detailWorkout.start_time), "PPP")} ·{" "}
              {detailWorkout && formatDuration(detailWorkout.start_time, detailWorkout.end_time)}
              {detailWorkout && detailWorkout.total_volume_kg != null && (
                <> · {Math.round(Number(detailWorkout.total_volume_kg))} kg</>
              )}
            </DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-2xl bg-muted/20 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {groupedSets.map(({ exerciseId, sets }) => (
                <motion.div
                  key={exerciseId}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-white/10 bg-background/25 p-3 space-y-2"
                >
                  <p className="font-bold text-sm">{detailNames[exerciseId] ?? `Exercise ${exerciseId}`}</p>
                  <ul className="space-y-1.5 text-sm">
                    {sets.map((s, i) => (
                      <li key={s.id} className="flex justify-between gap-2 text-muted-foreground">
                        <span>
                          Set {i + 1}: {s.weight_kg} kg × {s.reps}
                          {s.is_failure && <span className="text-destructive ml-1">failure</span>}
                        </span>
                        <span className="text-xs text-primary whitespace-nowrap">
                          ~{epley1rm(s.weight_kg, s.reps)} kg 1RM
                        </span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
              {groupedSets.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No sets logged.</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="rounded-full" asChild>
              <Link href={detailWorkout ? `/workout/${detailWorkout.id}/complete` : "#"}>Full summary</Link>
            </Button>
            <Button className="rounded-full" onClick={() => setDetailWorkout(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editWorkout} onOpenChange={(o) => !o && setEditWorkout(null)}>
        <DialogContent className="rounded-3xl glass-panel border-white/20">
          <DialogHeader>
            <DialogTitle>Edit session</DialogTitle>
            <DialogDescription>Name and notes (v2 sessions only).</DialogDescription>
          </DialogHeader>
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl bg-background/40 border border-white/10"
            placeholder="Workout name"
          />
          <textarea
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 rounded-2xl bg-background/40 border border-white/10 resize-none text-sm"
            placeholder="Notes"
          />
          <DialogFooter className="flex gap-2 sm:flex-row">
            <Button variant="outline" className="rounded-full" onClick={() => setEditWorkout(null)}>
              Cancel
            </Button>
            <Button className="rounded-full" onClick={handleSaveEdit} disabled={pending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteWorkout} onOpenChange={(o) => !o && setDeleteWorkout(null)}>
        <DialogContent className="rounded-3xl glass-panel border-white/20">
          <DialogHeader>
            <DialogTitle>Delete this session?</DialogTitle>
            <DialogDescription>Removed from history. Cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:flex-row">
            <Button variant="outline" className="rounded-full" onClick={() => setDeleteWorkout(null)}>
              Cancel
            </Button>
            {deleteWorkout && (
              <form action={deleteWorkoutFromForm}>
                <input type="hidden" name="workoutId" value={deleteWorkout.id} />
                <input type="hidden" name="redirectTo" value="/history" />
                <Button type="submit" variant="destructive" className="rounded-full">
                  Delete
                </Button>
              </form>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
        <DialogContent className="rounded-3xl glass-panel border-white/20">
          <DialogHeader>
            <DialogTitle>Save workout as routine</DialogTitle>
            <DialogDescription>Create a new routine or merge into an existing one.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">
                Add to existing routine
              </label>
              <select
                value={addToTemplateId}
                onChange={(e) => setAddToTemplateId(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-background/40 border border-white/10"
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
                  className="w-full px-4 py-3 rounded-2xl bg-background/40 border border-white/10"
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
            <Button className="rounded-full" onClick={handleSaveAsTemplate} disabled={pending}>
              <Dumbbell className="h-4 w-4 mr-2" />
              {addToTemplateId ? "Add to routine" : "Create routine"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
