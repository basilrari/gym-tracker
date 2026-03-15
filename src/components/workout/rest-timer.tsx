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
    <div className="fixed bottom-16 left-0 right-0 z-40 p-4 bg-card border-t border-border">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Rest</span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setPaused((p) => !p)}
            >
              {paused ? (
                <Play className="h-4 w-4" />
              ) : (
                <Pause className="h-4 w-4" />
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onSkip}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <motion.span
            className={`text-3xl font-bold tabular-nums ${
              isLow ? "text-primary animate-pulse" : ""
            }`}
            animate={isLow ? { scale: [1, 1.05, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1 }}
          >
            {Math.floor(remaining / 60)}:{(remaining % 60).toString().padStart(2, "0")}
          </motion.span>
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              initial={false}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
