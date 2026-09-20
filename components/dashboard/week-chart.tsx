"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils/cn";

export type WeekTrendPoint = {
  label: string;
  range: string;
  current: boolean;
  completed: number;
  onTime: number;
  late: number;
  created: number;
};

const ON_TIME = "#18704e";
const LATE = "#ec7357";
const CREATED = "#64748b";

function WeekTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: WeekTrendPoint }>;
}) {
  if (!active || !payload?.[0]) return null;
  const point = payload[0].payload;
  const onTimeRate = point.completed ? Math.round((point.onTime / point.completed) * 100) : null;
  return (
    <div className="min-w-44 rounded-xl border border-[var(--color-border-subtle)] bg-white px-3 py-2.5 shadow-lg">
      <p className="text-[11px] font-semibold text-[var(--color-text-primary)]">
        {point.current ? "This week" : point.range}
      </p>
      {!point.current ? (
        <p className="text-[10px] text-[var(--color-text-muted)]">{point.range}</p>
      ) : null}
      <dl className="mt-2 space-y-1 text-[11px]">
        <div className="flex justify-between gap-6">
          <dt className="text-[var(--color-text-secondary)]">Finished</dt>
          <dd className="font-semibold tabular-nums">{point.completed}</dd>
        </div>
        <div className="flex justify-between gap-6">
          <dt className="inline-flex items-center gap-1.5 text-[var(--color-text-secondary)]">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ON_TIME }} />
            On time
          </dt>
          <dd className="tabular-nums">{point.onTime}</dd>
        </div>
        <div className="flex justify-between gap-6">
          <dt className="inline-flex items-center gap-1.5 text-[var(--color-text-secondary)]">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: LATE }} />
            Late
          </dt>
          <dd className="tabular-nums">{point.late}</dd>
        </div>
        <div className="flex justify-between gap-6 border-t border-[var(--color-border-subtle)] pt-1">
          <dt className="inline-flex items-center gap-1.5 text-[var(--color-text-secondary)]">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: CREATED }} />
            Started
          </dt>
          <dd className="tabular-nums">{point.created}</dd>
        </div>
        {onTimeRate != null ? (
          <div className="flex justify-between gap-6">
            <dt className="text-[var(--color-text-secondary)]">On-time rate</dt>
            <dd className="font-semibold tabular-nums">{onTimeRate}%</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}

export function WeekChart({ data }: { data: WeekTrendPoint[] }) {
  const thisWeek = data.find((week) => week.current) ?? data.at(-1);
  const lastWeek = data.at(-2);
  const finished = data.reduce((sum, week) => sum + week.completed, 0);
  const onTime = data.reduce((sum, week) => sum + week.onTime, 0);
  const delta = (thisWeek?.completed ?? 0) - (lastWeek?.completed ?? 0);
  const onTimeRate = finished ? Math.round((onTime / finished) * 100) : 0;
  const maxValue = Math.max(4, ...data.map((week) => Math.max(week.completed, week.created)));

  const stats = [
    {
      label: "This week",
      value: String(thisWeek?.completed ?? 0),
      hint: `${thisWeek?.onTime ?? 0} on time · ${thisWeek?.late ?? 0} late`,
    },
    {
      label: "Vs last week",
      value: delta === 0 ? "Same" : `${delta > 0 ? "+" : ""}${delta}`,
      hint: `${lastWeek?.completed ?? 0} finished last week`,
      tone: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
    },
    {
      label: "8-week on time",
      value: `${onTimeRate}%`,
      hint: `${finished} finished in this window`,
    },
  ];

  return (
    <div>
      <div className="mb-3 grid grid-cols-3 gap-2">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg bg-slate-50 px-2.5 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
              {stat.label}
            </p>
            <p
              className={cn(
                "mt-0.5 text-lg font-semibold tabular-nums tracking-tight",
                stat.tone === "up" && "text-[var(--color-primary)]",
                stat.tone === "down" && "text-[var(--color-accent)]",
              )}
            >
              {stat.value}
            </p>
            <p className="truncate text-[10px] text-[var(--color-text-muted)]">{stat.hint}</p>
          </div>
        ))}
      </div>

      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="#eef2f6" strokeDasharray="3 6" />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748b", fontSize: 10 }}
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748b", fontSize: 10 }}
              width={28}
              domain={[0, maxValue + 1]}
            />
            <Tooltip
              cursor={{ fill: "#f8fafc" }}
              content={(props) => (
                <WeekTooltip
                  active={props.active}
                  payload={props.payload as unknown as Array<{ payload: WeekTrendPoint }> | undefined}
                />
              )}
            />
            <Bar dataKey="onTime" stackId="done" fill={ON_TIME} maxBarSize={26} name="On time" />
            <Bar dataKey="late" stackId="done" fill={LATE} radius={[4, 4, 0, 0]} maxBarSize={26} name="Late" />
            <Line
              type="monotone"
              dataKey="created"
              stroke={CREATED}
              strokeWidth={2}
              dot={{ r: 3, fill: "#fff", stroke: CREATED, strokeWidth: 2 }}
              activeDot={{ r: 4 }}
              name="Started"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[var(--color-text-secondary)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: ON_TIME }} />
          Finished on time
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: LATE }} />
          Finished late
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-px w-3 bg-slate-500" />
          Started that week
        </span>
      </div>
    </div>
  );
}
