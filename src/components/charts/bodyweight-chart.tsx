"use client";

import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { BodyMeasurement } from "@/lib/db/types";

const tipStyle = {
  borderRadius: 12,
  background: "hsl(var(--card) / 0.95)",
  border: "1px solid hsl(var(--border) / 0.6)",
  backdropFilter: "blur(12px)",
};

export function BodyweightChart({ data }: { data: BodyMeasurement[] }) {
  const displayData = data
    .filter((d) => d.weight_kg != null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({
      date: d.date,
      label: d.date.slice(5),
      weight: Number(d.weight_kg),
    }));

  if (displayData.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">No legacy measurement data</p>
    );
  }

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={displayData} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="measArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(210 70% 50%)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(210 70% 50%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 6" stroke="hsl(var(--border) / 0.35)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}`}
            width={36}
          />
          <Tooltip
            contentStyle={tipStyle}
            formatter={(value: number) => [`${value} kg`, "Measurement"]}
            labelFormatter={(label) => label}
          />
          <Area type="monotone" dataKey="weight" stroke="hsl(210 70% 50%)" strokeWidth={2} fill="url(#measArea)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
