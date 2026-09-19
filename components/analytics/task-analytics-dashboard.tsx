"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils/format";

type MemberAnalytics = {
  id: string;
  name: string;
  email: string;
  total: number;
  completed: number;
  active: number;
  overdue: number;
  missed: number;
  onTime: number;
  dueCompleted: number;
  completedLate: number;
  todo: number;
  inProgress: number;
  inReview: number;
  completed7d: number;
  completed30d: number;
  averageCompletionHours: number;
  averageLatenessHours: number;
  averageTaskPoints: number;
  completionRate: number;
  onTimeRate: number;
  reliability: number;
  score: number;
  rank: number;
};

type Analytics = {
  summary: {
    total: number;
    active: number;
    completed: number;
    overdue: number;
    missed: number;
    completionRate: number;
    onTime: number;
    completedLate: number;
    onTimeRate: number;
    averageScore: number;
  };
  completionTrend: { label: string; completed: number }[];
  byStatus: { status: string; value: number }[];
  members: MemberAnalytics[];
  topPerformer: MemberAnalytics | null;
  attention: {
    id: string;
    title: string;
    due_date: string | null;
    assignees: { id: string; name: string; email: string }[];
  }[];
  lateCompletions: {
    id: string;
    title: string;
    due_date: string | null;
    completed_at: string | null;
    days_late: number | null;
    score_points: number | null;
    assignees: { id: string; name: string; email: string }[];
  }[];
};

const chartColors = ["#18704e", "#5aa787", "#ec7357", "#9acbb7"];

export function TaskAnalyticsDashboard({
  analytics,
  teamView,
}: {
  analytics: Analytics;
  teamView: boolean;
}) {
  const formatHours = (hours: number) =>
    hours >= 24 ? `${(hours / 24).toFixed(1)}d` : `${hours}h`;
  const stats = [
    { label: teamView ? "Team score" : "Performance score", value: analytics.summary.averageScore, detail: "Out of 100" },
    { label: "Completion rate", value: `${analytics.summary.completionRate}%`, detail: `${analytics.summary.completed} completed` },
    { label: "On-time rate", value: `${analytics.summary.onTimeRate}%`, detail: `${analytics.summary.onTime} on time` },
    { label: "Late completions", value: analytics.summary.completedLate, detail: `${analytics.summary.missed} missed deadlines kept` },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-5 shadow-none">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">{stat.label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{stat.value}</p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{stat.detail}</p>
          </Card>
        ))}
      </div>

      {teamView && analytics.topPerformer ? (
        <Card className="flex flex-wrap items-center gap-5 border-emerald-100 bg-[var(--color-primary-soft)] shadow-none">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl" aria-hidden>🏆</div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">Current leader</p>
            <p className="mt-1 text-lg font-semibold">{analytics.topPerformer.name}</p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {analytics.topPerformer.completed} completed · {analytics.topPerformer.onTimeRate}% on time · {analytics.topPerformer.completedLate} late
            </p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-semibold text-[var(--color-primary)]">{analytics.topPerformer.score}</p>
            <p className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">Performance score</p>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <Card className="min-h-80 shadow-none">
          <CardTitle>Tasks completed by week</CardTitle>
          <p className="mb-5 mt-1 text-xs text-[var(--color-text-secondary)]">Last 8 weeks</p>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.completionTrend}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                <Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 12 }} />
                <Bar dataKey="completed" fill="#18704e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="min-h-80 shadow-none">
          <CardTitle>Workload status</CardTitle>
          <p className="mb-2 mt-1 text-xs text-[var(--color-text-secondary)]">Current distribution</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={analytics.byStatus} dataKey="value" nameKey="status" innerRadius={58} outerRadius={82} paddingAngle={3}>
                  {analytics.byStatus.map((entry, index) => <Cell key={entry.status} fill={chartColors[index % chartColors.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {analytics.byStatus.map((item, index) => (
              <div key={item.status} className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
                <span>{item.status}</span><strong className="ml-auto text-[var(--color-text-primary)]">{item.value}</strong>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {teamView ? (
        <>
        <Card className="overflow-hidden p-0 shadow-none">
          <div className="border-b border-[var(--color-border-subtle)] p-5">
            <CardTitle>Team leaderboard</CardTitle>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Scores are stored in MongoDB. On-time finishes score 100, overdue completions keep the miss and score 30–70, still-overdue tasks score 0.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                <tr>
                  <th className="px-4 py-3 text-center font-semibold">Rank</th>
                  <th className="px-5 py-3 font-semibold">Team member</th>
                  <th className="px-4 py-3 font-semibold">Score</th>
                  <th className="px-4 py-3 font-semibold">Assigned</th>
                  <th className="px-4 py-3 font-semibold">Completed</th>
                  <th className="px-4 py-3 font-semibold">Completion</th>
                  <th className="px-4 py-3 font-semibold">On time</th>
                  <th className="px-4 py-3 font-semibold">Late</th>
                  <th className="px-4 py-3 font-semibold">Overdue</th>
                  <th className="px-4 py-3 font-semibold">Missed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)]">
                {analytics.members.map((member) => (
                  <tr key={member.id} className={member.rank === 1 ? "bg-emerald-50/50" : ""}>
                    <td className="px-4 py-4 text-center">
                      <span className={member.rank === 1 ? "text-lg" : "font-semibold text-[var(--color-text-muted)]"}>
                        {member.rank === 1 ? "🏆" : `#${member.rank}`}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium">{member.name}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{member.email}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex min-w-12 justify-center rounded-lg bg-[var(--color-primary-soft)] px-2 py-1 font-semibold text-[var(--color-primary)]">
                        {member.score}
                      </span>
                    </td>
                    <td className="px-4 py-4">{member.total}</td>
                    <td className="px-4 py-4 text-emerald-700">{member.completed}</td>
                    <td className="px-4 py-4 font-medium">{member.completionRate}%</td>
                    <td className="px-4 py-4 font-medium">{member.onTimeRate}%</td>
                    <td className="px-4 py-4 text-amber-700">{member.completedLate}</td>
                    <td className="px-4 py-4 text-amber-700">{member.overdue}</td>
                    <td className="px-4 py-4 text-rose-700">{member.missed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <div className="grid gap-4 lg:grid-cols-2">
          {analytics.members.map((member) => (
            <Card key={member.id} className="shadow-none">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">{member.name}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)]">Rank #{member.rank} · {member.total} assigned</p>
                </div>
                <span className="rounded-lg bg-[var(--color-primary-soft)] px-3 py-1.5 text-lg font-semibold text-[var(--color-primary)]">
                  {member.score}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-border-subtle)] sm:grid-cols-4">
                {[
                  { label: "Last 7 days", value: member.completed7d },
                  { label: "Last 30 days", value: member.completed30d },
                  { label: "Avg. completion", value: formatHours(member.averageCompletionHours) },
                  { label: "Avg. late by", value: formatHours(member.averageLatenessHours) },
                  { label: "To do", value: member.todo },
                  { label: "In progress", value: member.inProgress },
                  { label: "In review", value: member.inReview },
                  { label: "Completed late", value: member.completedLate },
                  { label: "Task points", value: member.averageTaskPoints },
                  { label: "Reliability", value: `${member.reliability}%` },
                ].map((metric) => (
                  <div key={metric.label} className="bg-white p-3">
                    <p className="text-[9px] uppercase tracking-wide text-[var(--color-text-muted)]">{metric.label}</p>
                    <p className="mt-1 text-sm font-semibold">{metric.value}</p>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
        </>
      ) : null}

      <Card className="shadow-none">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <CardTitle>Needs attention</CardTitle>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">Currently overdue tasks</p>
          </div>
          <Link href="/tasks?status=" className="text-sm font-semibold text-[var(--color-primary)]">View tasks</Link>
        </div>
        {analytics.attention.length ? (
          <div className="divide-y divide-[var(--color-border-subtle)]">
            {analytics.attention.map((task) => (
              <div key={task.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <Link href="/tasks" className="font-medium hover:text-[var(--color-primary)]">{task.title}</Link>
                  <p className="text-xs text-[var(--color-text-muted)]">{task.assignees.map((user) => user.name).join(", ") || "Unassigned"}</p>
                </div>
                <Badge className="border-rose-200 bg-rose-50 text-rose-700">
                  Due {task.due_date ? formatDate(task.due_date) : "—"}
                </Badge>
              </div>
            ))}
          </div>
        ) : <p className="py-8 text-center text-sm text-[var(--color-text-secondary)]">No overdue tasks. Everything is on track.</p>}
      </Card>

      <Card className="shadow-none">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <CardTitle>Completed after deadline</CardTitle>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              These stay on the record and still count toward scores with reduced points.
            </p>
          </div>
        </div>
        {analytics.lateCompletions.length ? (
          <div className="divide-y divide-[var(--color-border-subtle)]">
            {analytics.lateCompletions.map((task) => (
              <div key={task.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <Link href="/tasks" className="font-medium hover:text-[var(--color-primary)]">{task.title}</Link>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {task.assignees.map((user) => user.name).join(", ") || "Unassigned"}
                    {task.completed_at ? ` · finished ${formatDate(task.completed_at.slice(0, 10))}` : ""}
                  </p>
                </div>
                <Badge className="border-amber-200 bg-amber-50 text-amber-800">
                  {task.days_late ?? 0}d late · {task.score_points ?? 0} pts
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-[var(--color-text-secondary)]">No late completions on record.</p>
        )}
      </Card>
    </div>
  );
}

