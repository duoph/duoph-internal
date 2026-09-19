import Link from "next/link";
import { dashboardService } from "@/lib/api/dashboard";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, Th, Td } from "@/components/ui/table";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { workTypeService } from "@/lib/api/work-types";
import { getCurrentUser, canViewTeamAnalytics } from "@/lib/auth/authorization";
import { taskAnalyticsService } from "@/lib/api/task-analytics";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const [metrics, workTypes, taskAnalytics] = await Promise.all([
    dashboardService.metrics(),
    workTypeService.list(),
    user
      ? taskAnalyticsService.get({ viewerId: user.id, canViewAll: canViewTeamAnalytics(user) })
      : null,
  ]);

  const statCards = [
    { label: "Active tasks", value: String(taskAnalytics?.summary.active ?? 0), detail: `${taskAnalytics?.summary.overdue ?? 0} overdue` },
    { label: "Completion rate", value: `${taskAnalytics?.summary.completionRate ?? 0}%`, detail: `${taskAnalytics?.summary.completed ?? 0} delivered` },
    { label: "Total clients", value: String(metrics.totalClients), detail: "All client accounts" },
    { label: "Current balance", value: formatMoney(metrics.balance), detail: "Income less expenses" },
  ];
  const today = new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date());

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{today}</p>
          <h1 className="page-title">Good day, {user?.name.split(" ")[0] ?? "team"}.</h1>
          <p className="page-subtitle">Here is what is happening across Duoph today.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/tasks">
            <Button type="button">View tasks</Button>
          </Link>
          <Link href="/clients">
            <Button type="button" variant="secondary">
              Clients
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label} className="p-5 shadow-none">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-(--color-text-muted)">{s.label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-[var(--color-text-primary)]">{s.value}</p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{s.detail}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
      <Card className="shadow-none">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <CardTitle>Recent transactions</CardTitle>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">Latest income and expenses</p>
          </div>
          <Link href="/cashflow" className="text-xs font-semibold text-[var(--color-primary)]">View cashflow</Link>
        </div>
        {metrics.recentTransactions.length === 0 ? (
          <p className="text-sm text-(--color-text-secondary)">No transactions yet.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Details</Th>
                <Th>Type</Th>
                <Th className="text-right">Income</Th>
                <Th className="text-right">Expense</Th>
              </tr>
            </thead>
            <tbody>
              {metrics.recentTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <Td>{formatDate(t.date)}</Td>
                  <Td>{t.details ?? "—"}</Td>
                  <Td>{workTypes.find((w) => w.key === t.work_type)?.label ?? t.work_type}</Td>
                  <Td className={`text-right tabular-nums ${t.payment_status === "pending" ? "text-[var(--color-accent)]" : "text-[var(--color-primary)]"}`}>
                    {Number(t.income) > 0
                      ? `${formatMoney(Number(t.income))}${t.payment_status === "pending" ? " pending" : ""}`
                      : "—"}
                  </Td>
                  <Td className="text-right tabular-nums text-red-400">
                    {Number(t.expense) > 0 ? formatMoney(Number(t.expense)) : "—"}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card className="shadow-none">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <CardTitle>Deadline watch</CardTitle>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">Tasks that need attention</p>
          </div>
          <Link href="/analytics" className="text-xs font-semibold text-[var(--color-primary)]">Analytics</Link>
        </div>
        {taskAnalytics?.attention.length ? (
          <div className="divide-y divide-[var(--color-border-subtle)]">
            {taskAnalytics.attention.slice(0, 5).map((task) => (
              <Link key={task.id} href="/tasks" className="flex items-center gap-3 py-3">
                <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{task.title}</span>
                  <span className="block truncate text-xs text-[var(--color-text-muted)]">
                    {task.assignees.map((assignee) => assignee.name).join(", ") || "Unassigned"}
                  </span>
                </span>
                <span className="text-xs font-medium text-rose-600">
                  {task.due_date ? formatDate(task.due_date) : "Overdue"}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex min-h-44 flex-col items-center justify-center text-center">
            <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">✓</span>
            <p className="text-sm font-medium">Everything is on track</p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">No overdue tasks right now.</p>
          </div>
        )}
      </Card>
      </div>
    </div>
  );
}
