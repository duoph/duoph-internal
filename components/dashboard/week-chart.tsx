"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function WeekChart({ data }: { data: { label: string; completed: number }[] }) {
  return (
    <div className="h-36">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#eef2f6" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} />
          <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} width={28} />
          <Tooltip
            cursor={{ fill: "#f8fafc" }}
            contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 12 }}
            formatter={(value) => [String(value ?? 0), "Finished"]}
          />
          <Bar dataKey="completed" fill="#18704e" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
