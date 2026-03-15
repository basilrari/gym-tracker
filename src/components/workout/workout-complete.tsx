"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { WorkoutWithSets } from "@/lib/db/types";

type WorkoutCompleteProps = {
  workout: WorkoutWithSets;
};

export function WorkoutComplete({ workout }: WorkoutCompleteProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    setShowConfetti(true);
    const t = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(t);
  }, []);

  const workingSets = workout.sets.filter((s) => !s.is_warmup);
  const totalVolume =
    workingSets.reduce((sum, s) => sum + s.weight_kg * s.reps, 0) ?? 0;

  return (
    <div className="p-4 space-y-10 max-w-lg mx-auto min-h-[80vh] flex flex-col justify-center">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="flex flex-col items-center text-center space-y-6"
      >
        <div className="relative w-32 h-32 flex items-center justify-center rounded-full shadow-neu-extruded bg-card">
          <div className="absolute inset-2 rounded-full shadow-neu-inset bg-card flex items-center justify-center">
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
          <div className="flex items-center justify-between p-4 rounded-2xl shadow-neu-inset">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Sets</span>
            <span className="font-bold text-xl">{workingSets.length}</span>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="pt-4"
      >
        <Link href="/">
          <Button size="xl" className="w-full rounded-full text-lg shadow-neu-extruded font-bold h-16">
            Finish & Return Home
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
