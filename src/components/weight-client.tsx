"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Scale, Trash2 } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import type { BodyWeightEntry } from "@/lib/db/types";
import { saveBodyWeightAction, deleteBodyWeightAction } from "@/app/actions/body-weight";
import { format } from "date-fns";

type Props = { initialEntries: BodyWeightEntry[] };

export function WeightClient({ initialEntries }: Props) {
  const [entries, setEntries] = useState(initialEntries);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [kg, setKg] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const chartData = entries.slice(-60).map((e) => ({
    date: e.date.slice(5),
    kg: e.weight_kg,
  }));

  const handleSave = async () => {
    const w = parseFloat(kg);
    if (Number.isNaN(w) || w <= 0) return;
    setSaving(true);
    try {
      const row = await saveBodyWeightAction(date, w, notes.trim() || null);
      setEntries((prev) => {
        const next = prev.filter((p) => p.date !== date);
        next.push(row);
        return next.sort((a, b) => a.date.localeCompare(b.date));
      });
      setNotes("");
      setKg("");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this entry?")) return;
    try {
      await deleteBodyWeightAction(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch {
      /* noop */
    }
  };

  return (
    <div className="px-4 py-6 space-y-6 max-w-mobile mx-auto w-full pb-28">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="rounded-full glass-panel border-0" asChild>
          <Link href="/" aria-label="Back home">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Scale className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Body weight</h1>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-4 h-48"
      >
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="wfill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={36} domain={["dataMin - 1", "dataMax + 1"]} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card) / 0.95)",
                }}
              />
              <Area type="monotone" dataKey="kg" stroke="hsl(var(--primary))" fill="url(#wfill)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-12">Log a weight to see your trend.</p>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-panel p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Add entry</p>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl bg-background/40 border border-white/10 px-3 py-2 text-sm"
          />
          <input
            type="number"
            step={0.1}
            min={1}
            placeholder="kg"
            value={kg}
            onChange={(e) => setKg(e.target.value)}
            className="rounded-xl bg-background/40 border border-white/10 px-3 py-2 text-sm"
          />
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          rows={2}
          className="w-full rounded-xl bg-background/40 border border-white/10 px-3 py-2 text-sm resize-none"
        />
        <Button className="w-full rounded-full" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </motion.div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">History</p>
        <div className="space-y-2">
          {[...entries].reverse().map((e, i) => (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02 }}
              className="glass-panel flex items-center justify-between gap-2 px-4 py-3"
            >
              <div>
                <p className="font-bold">{e.weight_kg} kg</p>
                <p className="text-xs text-muted-foreground">{e.date}</p>
                {e.notes && <p className="text-xs text-muted-foreground mt-1">{e.notes}</p>}
              </div>
              <Button type="button" variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => handleDelete(e.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
