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

type Analytics = {
  summary: {
    total: number;
    active: number;
    completed: number;
    overdue: number;
    missed: number;
    completionRate: number;
  };
  completionTrend: { label: string; completed: number }[];
  byStatus: { status: string; value: number }[];
  members: {
    id: string;
    name: string;
    email: string;
    total: number;
    completed: number;
    active: number;
    overdue: number;
    missed: number;
  }[];
  attention: {
    id: string;
    title: string;
    due_date: string | null;
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
  const stats = [
    { label: "Completion rate", value: `${analytics.summary.completionRate}%`, detail: `${analytics.summary.completed} completed` },
    { label: "Active tasks", value: analytics.summary.active, detail: `${analytics.summary.total} total` },
    { label: "Overdue now", value: analytics.summary.overdue, detail: "Needs attention" },
    { label: "Deadlines missed", value: analytics.summary.missed, detail: "Historical total" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">{teamView ? "Team performance" : "My performance"}</p>
        <h1 className="page-title">Task analytics</h1>
        <p className="page-subtitle">Delivery health, workload, and deadline performance at a glance.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-5 shadow-none">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">{stat.label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{stat.value}</p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{stat.detail}</p>
          </Card>
        ))}
      </div>

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
        <Card className="overflow-hidden p-0 shadow-none">
          <div className="border-b border-[var(--color-border-subtle)] p-5">
            <CardTitle>Team performance</CardTitle>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">Assigned workload and deadline record</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Team member</th>
                  <th className="px-4 py-3 font-semibold">Assigned</th>
                  <th className="px-4 py-3 font-semibold">Active</th>
                  <th className="px-4 py-3 font-semibold">Completed</th>
                  <th className="px-4 py-3 font-semibold">Overdue</th>
                  <th className="px-4 py-3 font-semibold">Missed</th>
                  <th className="px-5 py-3 font-semibold">Completion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)]">
                {analytics.members.map((member) => (
                  <tr key={member.id}>
                    <td className="px-5 py-4">
                      <p className="font-medium">{member.name}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{member.email}</p>
                    </td>
                    <td className="px-4 py-4">{member.total}</td>
                    <td className="px-4 py-4">{member.active}</td>
                    <td className="px-4 py-4 text-emerald-700">{member.completed}</td>
                    <td className="px-4 py-4 text-amber-700">{member.overdue}</td>
                    <td className="px-4 py-4 text-rose-700">{member.missed}</td>
                    <td className="px-5 py-4">
                      <span className="font-semibold">{member.total ? Math.round((member.completed / member.total) * 100) : 0}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
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
    </div>
  );
}

