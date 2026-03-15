"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Pause, Play, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";

type RestTimerProps = {
  seconds: number;
  active: boolean;
  onComplete: () => void;
  onSkip: () => void;
};

export function RestTimer({
  seconds,
  active,
  onComplete,
  onSkip,
}: RestTimerProps) {
  const [remaining, setRemaining] = useState(seconds);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (active && !paused) {
      setRemaining(seconds);
    }
  }, [active, paused, seconds]);

  useEffect(() => {
    if (!active) return;

    if (paused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    setRemaining((r) => {
      if (r <= 0) {
        onComplete();
        return 0;
      }
      return r;
    });

    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          onComplete();
          return 0;
        }
        return r - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [active, paused, onComplete]);

  if (!active) return null;

  const progress = 1 - remaining / seconds;
  const isLow = remaining <= 10;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 p-4 bg-card rounded-3xl shadow-neu-extruded max-w-sm mx-auto">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Rest Timer</span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full shadow-neu-extruded active:shadow-neu-pressed h-9 w-9 text-primary flex items-center justify-center"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? "Resume" : "Pause"}
          >
            {paused ? (
              <Play className="h-4 w-4 ml-0.5" fill="currentColor" />
            ) : (
              <Pause className="h-4 w-4" fill="currentColor" />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full shadow-neu-extruded active:shadow-neu-pressed h-8 w-8 text-muted-foreground"
            onClick={onSkip}
          >
            <SkipForward className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <motion.span
          className={`text-2xl font-bold tabular-nums tracking-tight ${
            isLow ? "text-primary drop-shadow-[0_0_5px_hsl(var(--primary)/0.5)]" : "text-foreground"
          }`}
          animate={isLow ? { scale: [1, 1.05, 1] } : {}}
          transition={{ repeat: Infinity, duration: 1 }}
        >
          {Math.floor(remaining / 60)}:{(remaining % 60).toString().padStart(2, "0")}
        </motion.span>
        <div className="flex-1 h-3 bg-card shadow-neu-inset rounded-full overflow-hidden p-0.5">
          <motion.div
            className="h-full bg-primary rounded-full shadow-[0_0_8px_hsl(var(--primary)/0.5)]"
            initial={false}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.5, ease: "linear" }}
          />
        </div>
      </div>
    </div>
  );
}
