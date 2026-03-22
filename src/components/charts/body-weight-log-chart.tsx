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
import type { BodyWeightEntry } from "@/lib/db/types";

const tipStyle = {
  borderRadius: 12,
  background: "hsl(var(--card) / 0.95)",
  border: "1px solid hsl(var(--border) / 0.6)",
  backdropFilter: "blur(12px)",
};

export function BodyWeightLogChart({ data }: { data: BodyWeightEntry[] }) {
  const displayData = [...data]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({
      date: d.date,
      label: d.date,
      short: d.date.slice(5),
      kg: d.weight_kg,
    }));

  if (displayData.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Log weight on the Weight tab</p>;
  }

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={displayData} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="bwArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 6" stroke="hsl(var(--border) / 0.35)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(_, i) => displayData[i]?.short ?? ""}
          />
          <YAxis
            domain={["dataMin - 1", "dataMax + 1"]}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}`}
            width={36}
          />
          <Tooltip
            contentStyle={tipStyle}
            formatter={(v: number) => [`${v} kg`, "Body weight"]}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""}
          />
          <Area type="monotone" dataKey="kg" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#bwArea)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
