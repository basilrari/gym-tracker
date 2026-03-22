"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Check, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { deleteWorkoutFromForm, updateWorkoutAction } from "@/app/actions/end-workout";
import type { WorkoutWithSets } from "@/lib/db/types";

type WorkoutCompleteProps = {
  workout: WorkoutWithSets;
};

export function WorkoutComplete({ workout }: WorkoutCompleteProps) {
  const router = useRouter();
  const [showConfetti, setShowConfetti] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState(workout.name);
  const [editNameError, setEditNameError] = useState<string | null>(null);

  useEffect(() => {
    setShowConfetti(true);
    const t = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(t);
  }, []);

  const workingSets = workout.sets.filter((s) => !s.is_warmup);
  const totalVolume =
    workingSets.reduce((sum, s) => sum + s.weight_kg * s.reps, 0) ?? 0;

  return (
    <div className="p-4 space-y-10 max-w-mobile mx-auto w-full min-h-[80vh] flex flex-col justify-center pb-28">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="flex flex-col items-center text-center space-y-6"
      >
        <div className="relative w-32 h-32 flex items-center justify-center rounded-full glass-panel">
          <div className="absolute inset-2 rounded-full border border-white/10 bg-background/30 flex items-center justify-center">
            <Check className="h-12 w-12 text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)]" />
          </div>
        </div>
        
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Workout Complete</h1>
          <p className="text-muted-foreground mt-2 font-medium">{workout.name}</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="p-6 rounded-3xl bg-card shadow-neu-extruded space-y-4">
          <div className="flex items-center justify-between p-4 rounded-2xl shadow-neu-inset">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total volume</span>
            <span className="font-bold text-xl text-primary">{Math.round(totalVolume)} kg</span>
          </div>
          <div className="flex items-center justify-between p-4 rounded-2xl bg-background/25 border border-white/5">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Sets</span>
            <span className="font-bold text-xl">{workingSets.length}</span>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="pt-4 space-y-3"
      >
        <Link href="/">
          <Button size="xl" className="w-full rounded-full text-lg shadow-neu-extruded font-bold h-16">
            Finish & Return Home
          </Button>
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full rounded-full text-muted-foreground hover:text-foreground"
          onClick={() => {
            setEditDialogOpen(true);
            setEditName(workout.name);
            setEditNameError(null);
          }}
        >
          <Pencil className="h-4 w-4 mr-2" />
          Edit workout name
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full rounded-full text-muted-foreground hover:text-destructive"
          onClick={() => setDeleteDialogOpen(true)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete workout
        </Button>
      </motion.div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="rounded-3xl glass-panel border-white/20">
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
          {editNameError && (
            <p className="text-sm text-destructive" role="alert">
              {editNameError}
            </p>
          )}
          <DialogFooter className="flex gap-2 sm:flex-row">
            <Button variant="outline" className="rounded-full" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="rounded-full"
              onClick={async () => {
                setEditNameError(null);
                const result = await updateWorkoutAction(workout.id, editName);
                if (!result.ok) {
                  setEditNameError(result.message);
                  return;
                }
                setEditDialogOpen(false);
                router.refresh();
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="rounded-3xl glass-panel border-white/20">
          <DialogHeader>
            <DialogTitle>Delete this workout?</DialogTitle>
            <DialogDescription>
              This will remove the workout from your history. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="rounded-full" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <form action={deleteWorkoutFromForm} className="inline">
              <input type="hidden" name="workoutId" value={workout.id} />
              <Button type="submit" variant="destructive" className="rounded-full">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
