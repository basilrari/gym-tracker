"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
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
    <div className="p-4 space-y-6 max-w-lg mx-auto min-h-screen flex flex-col justify-center">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="text-center"
      >
        <CheckCircle2 className="h-20 w-20 text-primary mx-auto mb-4" />
        <h1 className="text-2xl font-bold">Workout Complete!</h1>
        <p className="text-muted-foreground mt-1">{workout.name}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total volume</span>
              <span className="font-bold text-xl">
                {Math.round(totalVolume)} kg
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sets</span>
              <span className="font-bold">{workingSets.length}</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <Link href="/">
          <Button size="lg" className="w-full">
            Back to Home
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
