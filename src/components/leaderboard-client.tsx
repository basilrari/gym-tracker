"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LeaderboardRow } from "@/lib/db/types";

type LeaderboardClientProps = {
  consistency7d: LeaderboardRow[];
  consistency30d: LeaderboardRow[];
  volume7d: LeaderboardRow[];
  volume30d: LeaderboardRow[];
  myRank7d: number | null;
  myRank30d: number | null;
  currentUserId: string;
};

export function LeaderboardClient({
  consistency7d,
  consistency30d,
  volume7d,
  volume30d,
  myRank7d,
  myRank30d,
  currentUserId,
}: LeaderboardClientProps) {
  const [period, setPeriod] = useState<"7d" | "30d">("7d");
  const [metric, setMetric] = useState<"consistency" | "volume">("consistency");

  const consistency = period === "7d" ? consistency7d : consistency30d;
  const volume = period === "7d" ? volume7d : volume30d;
  const myRank = metric === "consistency"
    ? period === "7d"
      ? myRank7d
      : myRank30d
    : null;

  const rows = metric === "consistency" ? consistency : volume;

  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto pb-8">
      <div className="text-center space-y-1 mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Leaderboard</h1>
        <p className="text-muted-foreground text-xs uppercase tracking-wider">Compete with the community</p>
      </div>

      {myRank && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="p-6 rounded-3xl bg-card shadow-neu-inset text-center relative overflow-hidden">
            <div className="absolute inset-0 border border-primary/20 rounded-3xl" />
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Your Rank</p>
            <p className="text-4xl font-bold text-primary text-glow flex items-center justify-center gap-2">
              <Trophy className="h-8 w-8" />
              #{myRank}
            </p>
          </div>
        </motion.div>
      )}

      <div className="flex rounded-full shadow-neu-inset bg-card p-1">
        <button
          type="button"
          onClick={() => setPeriod("7d")}
          className={`flex-1 py-2 rounded-full text-sm font-bold transition-all duration-250 ${
            period === "7d" ? "bg-primary text-primary-foreground shadow-neu-extruded" : "text-muted-foreground active:scale-95"
          }`}
        >
          7 days
        </button>
        <button
          type="button"
          onClick={() => setPeriod("30d")}
          className={`flex-1 py-2 rounded-full text-sm font-bold transition-all duration-250 ${
            period === "30d" ? "bg-primary text-primary-foreground shadow-neu-extruded" : "text-muted-foreground active:scale-95"
          }`}
        >
          30 days
        </button>
      </div>

      <div className="flex rounded-full shadow-neu-inset bg-card p-1">
        <button
          type="button"
          onClick={() => setMetric("consistency")}
          className={`flex-1 py-2 rounded-full text-sm font-bold flex items-center justify-center gap-2 transition-all duration-250 ${
            metric === "consistency"
              ? "bg-primary text-primary-foreground shadow-neu-extruded"
              : "text-muted-foreground active:scale-95"
          }`}
        >
          <Flame className="h-4 w-4" />
          Consistency
        </button>
        <button
          type="button"
          onClick={() => setMetric("volume")}
          className={`flex-1 py-2 rounded-full text-sm font-bold flex items-center justify-center gap-2 transition-all duration-250 ${
            metric === "volume"
              ? "bg-primary text-primary-foreground shadow-neu-extruded"
              : "text-muted-foreground active:scale-95"
          }`}
        >
          <Trophy className="h-4 w-4" />
          Volume
        </button>
      </div>

      <div className="space-y-2 pt-2">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2">
          {metric === "consistency" ? "Top Workouts" : "Top Volume"} ({period})
        </h2>
        <div className="p-4 rounded-3xl bg-card shadow-neu-extruded space-y-3">
          {rows.map((row) => (
            <div
              key={row.user_id}
              className={`flex justify-between items-center p-4 rounded-2xl transition-all ${
                row.user_id === currentUserId 
                  ? "shadow-neu-extruded bg-background/50 border border-primary/20" 
                  : "shadow-neu-inset bg-card"
              }`}
            >
              <span className="font-bold text-base flex items-center gap-3">
                <span className="text-primary text-lg w-6">#{row.rank}</span>
                {row.display_name || row.username}
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                {metric === "consistency"
                  ? `${row.workouts_count} workouts`
                  : `${Math.round(row.total_volume_kg)} kg`}
              </span>
            </div>
          ))}
          {rows.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No data yet. Complete workouts to appear on the leaderboard.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
