import Link from "next/link";
import { dashboardService } from "@/lib/api/dashboard";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeaderActions } from "@/components/layout/page-chrome";
import { Table, Th, Td } from "@/components/ui/table";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { workTypeService } from "@/lib/api/work-types";
import { canManageFinance, getCurrentUser, type CurrentUser } from "@/lib/auth/authorization";
import { taskAnalyticsService } from "@/lib/api/task-analytics";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const taskAnalytics = await taskAnalyticsService.get({
    viewerId: user.id,
    canViewAll: true,
  });
  if (!canManageFinance(user)) {
    return <MemberDashboard user={user} analytics={taskAnalytics} />;
  }

  const [metrics, workTypes] = await Promise.all([
    dashboardService.metrics(),
    workTypeService.list(),
  ]);

  const statCards = [
    { label: "Active tasks", value: String(taskAnalytics.summary.active), detail: `${taskAnalytics.summary.overdue} overdue` },
    { label: "Completion rate", value: `${taskAnalytics.summary.completionRate}%`, detail: `${taskAnalytics.summary.completed} delivered` },
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
      <PageHeaderActions>
        <Link href="/tasks">
          <Button type="button" className="h-9 px-3.5 py-0 text-xs">View tasks</Button>
        </Link>
        <Link href="/clients">
          <Button type="button" variant="secondary" className="h-9 px-3.5 py-0 text-xs">
            Clients
          </Button>
        </Link>
      </PageHeaderActions>
      <p className="text-sm text-[var(--color-text-secondary)]">
        {today} — Good day, {user?.name.split(" ")[0] ?? "team"}. Here is what is happening across Duoph today.
      </p>

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
        {taskAnalytics.attention.length ? (
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

type TaskAnalytics = Awaited<ReturnType<typeof taskAnalyticsService.get>>;

function MemberDashboard({
  user,
  analytics,
}: {
  user: CurrentUser;
  analytics: TaskAnalytics;
}) {
  const personal = analytics.members.find((member) => member.id === user.id);
  const stats = [
    { label: "Your rank", value: personal ? `#${personal.rank}` : "—", detail: `${analytics.members.length} teammates` },
    { label: "Performance score", value: personal?.score ?? 0, detail: `Team average ${analytics.summary.averageScore}` },
    { label: "Active tasks", value: personal?.active ?? 0, detail: `${personal?.completed ?? 0} completed` },
    { label: "Completion rate", value: `${personal?.completionRate ?? 0}%`, detail: `${personal?.total ?? 0} assigned` },
    { label: "On-time delivery", value: `${personal?.onTimeRate ?? 0}%`, detail: `${personal?.onTime ?? 0} on time` },
    { label: "Late completions", value: personal?.completedLate ?? 0, detail: `${personal?.missed ?? 0} missed kept on record` },
  ];
  const scoreDifference = (personal?.score ?? 0) - analytics.summary.averageScore;

  return (
    <div className="space-y-7">
      <PageHeaderActions>
        <Link href="/tasks"><Button type="button" className="h-9 px-3.5 py-0 text-xs">My tasks</Button></Link>
        <Link href="/clients"><Button type="button" variant="secondary" className="h-9 px-3.5 py-0 text-xs">Add client</Button></Link>
      </PageHeaderActions>
      <p className="text-sm text-[var(--color-text-secondary)]">
        Welcome back, {user.name.split(" ")[0]}. Track your work, compare progress, and keep moving up.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-5 shadow-none">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">{stat.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">{stat.value}</p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{stat.detail}</p>
          </Card>
        ))}
      </div>

      <Card className="flex flex-wrap items-center gap-5 border-emerald-100 bg-[var(--color-primary-soft)] shadow-none">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl" aria-hidden>
          {scoreDifference >= 0 ? "↗" : "↑"}
        </div>
        <div className="min-w-0 flex-1">
          <CardTitle>{scoreDifference >= 0 ? "You are above the team average" : "Your next target is within reach"}</CardTitle>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            {scoreDifference >= 0
              ? `${scoreDifference} points ahead. Keep completing work on time.`
              : `${Math.abs(scoreDifference)} more points to reach the current team average.`}
          </p>
        </div>
        <Link href="/analytics" className="text-xs font-semibold text-[var(--color-primary)]">View detailed analytics →</Link>
      </Card>

      <Card className="overflow-hidden p-0 shadow-none">
        <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] p-5">
          <div>
            <CardTitle>Team leaderboard</CardTitle>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">Everyone can see progress; financial data remains private.</p>
          </div>
          <Link href="/analytics" className="text-xs font-semibold text-[var(--color-primary)]">All KPIs</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">
              <tr>
                <th className="px-5 py-3">Rank</th>
                <th className="px-4 py-3">Team member</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Completed</th>
                <th className="px-4 py-3">On time</th>
                <th className="px-4 py-3">Late</th>
                <th className="px-4 py-3">Overdue</th>
                <th className="px-5 py-3">Missed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-subtle)]">
              {analytics.members.map((member) => (
                <tr key={member.id} className={member.id === user.id ? "bg-emerald-50/50" : ""}>
                  <td className="px-5 py-4 font-semibold">{member.rank === 1 && member.score > 0 ? "🏆" : `#${member.rank}`}</td>
                  <td className="px-4 py-4">
                    <p className="font-medium">{member.name}{member.id === user.id ? " · You" : ""}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">{member.active} active tasks</p>
                  </td>
                  <td className="px-4 py-4 font-semibold text-[var(--color-primary)]">{member.score}</td>
                  <td className="px-4 py-4">{member.completed}</td>
                  <td className="px-4 py-4">{member.onTimeRate}%</td>
                  <td className="px-4 py-4 text-amber-700">{member.completedLate}</td>
                  <td className="px-4 py-4 text-amber-700">{member.overdue}</td>
                  <td className="px-5 py-4 text-rose-700">{member.missed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
