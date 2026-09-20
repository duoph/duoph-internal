import Link from "next/link";
import { PageHeaderActions } from "@/components/layout/page-chrome";
import { Button } from "@/components/ui/button";
import { WeekChart } from "@/components/dashboard/week-chart";
import { formatDate, formatFriendlyDate, formatMoney } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { TaskAnalytics } from "@/lib/api/task-analytics";
import type { CashflowWithClient } from "@/lib/types/database";

const statusColors = ["#94a3b8", "#0ea5e9", "#8b5cf6", "#18704e"];

export function OverviewView({
  firstName,
  currentUserId,
  canFinance,
  analytics,
  clients,
  balance,
  recentTransactions,
  workTypeLabels,
}: {
  firstName: string;
  currentUserId: string;
  canFinance: boolean;
  analytics: TaskAnalytics;
  clients?: number;
  balance?: number;
  recentTransactions?: CashflowWithClient[];
  workTypeLabels?: Record<string, string>;
}) {
  const you = analytics.members.find((member) => member.id === currentUserId);
  const statusTotal = analytics.byStatus.reduce((sum, item) => sum + item.value, 0) || 1;
  const kpis = canFinance
    ? [
        { label: "Open work", value: String(analytics.summary.active), hint: `${analytics.summary.overdue} overdue` },
        { label: "Finished", value: String(analytics.summary.completed), hint: `${analytics.summary.completionRate}% of all tasks` },
        { label: "On time", value: `${analytics.summary.onTimeRate}%`, hint: `${analytics.summary.completedLate} finished late` },
        { label: "Team score", value: String(analytics.summary.averageScore), hint: analytics.topPerformer ? `${analytics.topPerformer.name} leading` : "Out of 100" },
        { label: "Balance", value: formatMoney(balance ?? 0), hint: `${clients ?? 0} clients` },
      ]
    : [
        { label: "Your rank", value: you ? `#${you.rank}` : "—", hint: `${analytics.members.length} on the board` },
        { label: "Your score", value: String(you?.score ?? 0), hint: `Team avg ${analytics.summary.averageScore}` },
        { label: "Still open", value: String(you?.active ?? 0), hint: `${you?.completed ?? 0} finished` },
        { label: "On time", value: `${you?.onTimeRate ?? 0}%`, hint: `${you?.completedLate ?? 0} late` },
      ];

  return (
    <div className="space-y-4">
      <PageHeaderActions>
        <Link href="/tasks">
          <Button type="button" className="h-9 px-3.5 py-0 text-xs">Open tasks</Button>
        </Link>
      </PageHeaderActions>

      <p className="text-sm text-[var(--color-text-secondary)]">
        Hi {firstName}. Open work, who’s delivering, and what needs a push — in one place.
      </p>

      <div className={cn(
        "grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-[var(--color-border-subtle)]",
        canFinance ? "sm:grid-cols-3 xl:grid-cols-5" : "sm:grid-cols-4",
      )}>
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">{kpi.label}</p>
            <p className="mt-1 truncate text-xl font-semibold tracking-tight">{kpi.value}</p>
            <p className="mt-0.5 truncate text-[11px] text-[var(--color-text-secondary)]">{kpi.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white p-4">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Finished each week</h2>
              <p className="text-[11px] text-[var(--color-text-muted)]">Last 8 weeks</p>
            </div>
            <Link href="/tasks" className="text-[11px] font-semibold text-[var(--color-primary)]">Tasks</Link>
          </div>
          <WeekChart data={analytics.completionTrend} />
          <div className="mt-3">
            <p className="mb-1.5 text-[11px] font-medium text-[var(--color-text-secondary)]">Where work sits now</p>
            <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
              {analytics.byStatus.map((item, index) => (
                <span
                  key={item.status}
                  className="h-full"
                  style={{ width: `${(item.value / statusTotal) * 100}%`, backgroundColor: statusColors[index % statusColors.length] }}
                />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {analytics.byStatus.map((item, index) => (
                <span key={item.status} className="inline-flex items-center gap-1.5 text-[11px] text-[var(--color-text-secondary)]">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusColors[index % statusColors.length] }} />
                  {item.status} <strong className="font-semibold text-[var(--color-text-primary)]">{item.value}</strong>
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white p-4">
          <h2 className="text-sm font-semibold">Needs a push</h2>
          <p className="mb-3 text-[11px] text-[var(--color-text-muted)]">Overdue first, then late finishes</p>
          <div className="space-y-2">
            {analytics.attention.slice(0, 4).map((task) => (
              <Link key={task.id} href="/tasks?due=overdue" className="flex items-start gap-2 rounded-lg px-1 py-1 hover:bg-slate-50">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{task.title}</span>
                  <span className="block truncate text-[11px] text-[var(--color-text-muted)]">
                    {task.assignees.map((person) => person.name).join(", ") || "Unassigned"}
                  </span>
                </span>
                <span className="shrink-0 text-[11px] font-medium text-rose-600">
                  {task.due_date ? formatFriendlyDate(task.due_date) : "Overdue"}
                </span>
              </Link>
            ))}
            {analytics.lateCompletions.slice(0, 3).map((task) => (
              <Link key={task.id} href="/tasks" className="flex items-start gap-2 rounded-lg px-1 py-1 hover:bg-slate-50">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{task.title}</span>
                  <span className="block truncate text-[11px] text-[var(--color-text-muted)]">
                    {task.assignees.map((person) => person.name).join(", ") || "Unassigned"}
                  </span>
                </span>
                <span className="shrink-0 text-[11px] font-medium text-amber-700">
                  {task.days_late ?? 0}d late
                </span>
              </Link>
            ))}
            {!analytics.attention.length && !analytics.lateCompletions.length ? (
              <p className="py-6 text-center text-sm text-[var(--color-text-secondary)]">Nothing overdue. Team is on track.</p>
            ) : null}
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Who’s delivering</h2>
            <p className="text-[11px] text-[var(--color-text-muted)]">
              Higher score = finishing on time. Late work still counts, with fewer points.
            </p>
          </div>
          {analytics.topPerformer ? (
            <p className="hidden text-[11px] text-[var(--color-text-secondary)] sm:block">
              Lead: <span className="font-semibold text-[var(--color-primary)]">{analytics.topPerformer.name}</span> · {analytics.topPerformer.score}
            </p>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">
              <tr>
                <th className="px-4 py-2 font-semibold">#</th>
                <th className="px-3 py-2 font-semibold">Person</th>
                <th className="px-3 py-2 font-semibold">Score</th>
                <th className="px-3 py-2 font-semibold">Done</th>
                <th className="px-3 py-2 font-semibold">On time</th>
                <th className="px-3 py-2 font-semibold">Late</th>
                <th className="px-4 py-2 font-semibold">Overdue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-subtle)]">
              {analytics.members.map((member) => {
                const isYou = member.id === currentUserId;
                return (
                  <tr key={member.id} className={isYou ? "bg-emerald-50/60" : ""}>
                    <td className="px-4 py-2.5 font-semibold text-[var(--color-text-muted)]">
                      {member.rank === 1 && member.score > 0 ? "1" : member.rank}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-medium">{member.name}</span>
                      {isYou ? <span className="ml-1 text-[11px] text-[var(--color-primary)]">you</span> : null}
                      <span className="ml-2 text-[11px] text-[var(--color-text-muted)]">{member.active} open</span>
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-[var(--color-primary)]">{member.score}</td>
                    <td className="px-3 py-2.5">{member.completed}</td>
                    <td className="px-3 py-2.5">{member.onTimeRate}%</td>
                    <td className="px-3 py-2.5 text-amber-700">{member.completedLate}</td>
                    <td className="px-4 py-2.5 text-rose-700">{member.overdue}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {canFinance ? (
        <section className="rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Latest money</h2>
              <p className="text-[11px] text-[var(--color-text-muted)]">Recent income and spend</p>
            </div>
            <Link href="/cashflow" className="text-[11px] font-semibold text-[var(--color-primary)]">Cashflow</Link>
          </div>
          {recentTransactions?.length ? (
            <div className="divide-y divide-[var(--color-border-subtle)]">
              {recentTransactions.slice(0, 5).map((tx) => {
                const income = Number(tx.income);
                const expense = Number(tx.expense);
                return (
                  <div key={tx.id} className="flex items-center gap-3 py-2">
                    <span className="w-24 shrink-0 text-[11px] text-[var(--color-text-muted)]">{formatDate(tx.date)}</span>
                    <span className="min-w-0 flex-1 truncate text-[13px]">{tx.details || workTypeLabels?.[tx.work_type] || tx.work_type}</span>
                    <span className={cn("shrink-0 text-[13px] tabular-nums", income > 0 ? "text-[var(--color-primary)]" : "text-red-500")}>
                      {income > 0
                        ? `${formatMoney(income)}${tx.payment_status === "pending" ? " · pending" : ""}`
                        : expense > 0
                          ? `−${formatMoney(expense)}`
                          : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-4 text-sm text-[var(--color-text-secondary)]">No transactions yet.</p>
          )}
        </section>
      ) : null}
    </div>
  );
}
