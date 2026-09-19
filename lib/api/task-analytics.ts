import "server-only";

import { endOfWeek, format, startOfWeek, subWeeks } from "date-fns";
import { taskService } from "@/lib/api/tasks";

export type TaskAnalyticsAccess = {
  viewerId: string;
  canViewAll: boolean;
};

function isOverdue(dueDate: string | null, status: string) {
  if (!dueDate || status === "completed" || status === "cancelled") return false;
  return dueDate < new Date().toISOString().slice(0, 10);
}

export const taskAnalyticsService = {
  async get(access: TaskAnalyticsAccess) {
    const tasks = await taskService.list(access);
    const relevant = tasks.filter((task) => task.status !== "cancelled");
    const completed = relevant.filter((task) => task.status === "completed");
    const missed = relevant.filter((task) => Boolean(task.first_missed_at));
    const overdue = relevant.filter((task) => isOverdue(task.due_date, task.status));
    const active = relevant.filter((task) => task.status !== "completed");

    const members = new Map<
      string,
      {
        id: string;
        name: string;
        email: string;
        total: number;
        completed: number;
        active: number;
        overdue: number;
        missed: number;
      }
    >();

    for (const task of relevant) {
      for (const assignee of task.assignees) {
        const row = members.get(assignee.id) ?? {
          ...assignee,
          total: 0,
          completed: 0,
          active: 0,
          overdue: 0,
          missed: 0,
        };
        row.total += 1;
        if (task.status === "completed") row.completed += 1;
        else row.active += 1;
        if (isOverdue(task.due_date, task.status)) row.overdue += 1;
        if (task.first_missed_at) row.missed += 1;
        members.set(assignee.id, row);
      }
    }

    const now = new Date();
    const completionTrend = Array.from({ length: 8 }, (_, index) => {
      const anchor = subWeeks(now, 7 - index);
      const start = startOfWeek(anchor, { weekStartsOn: 1 });
      const end = endOfWeek(anchor, { weekStartsOn: 1 });
      const count = completed.filter((task) => {
        if (!task.completed_at) return false;
        const date = new Date(task.completed_at);
        return date >= start && date <= end;
      }).length;
      return { label: format(start, "MMM d"), completed: count };
    });

    const byStatus = [
      { status: "To do", value: relevant.filter((task) => task.status === "todo").length },
      { status: "In progress", value: relevant.filter((task) => task.status === "in_progress").length },
      { status: "In review", value: relevant.filter((task) => task.status === "in_review").length },
      { status: "Completed", value: completed.length },
    ];

    return {
      summary: {
        total: relevant.length,
        active: active.length,
        completed: completed.length,
        overdue: overdue.length,
        missed: missed.length,
        completionRate: relevant.length ? Math.round((completed.length / relevant.length) * 100) : 0,
      },
      completionTrend,
      byStatus,
      members: [...members.values()].sort((a, b) => b.missed - a.missed || b.total - a.total),
      attention: overdue
        .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))
        .slice(0, 8),
    };
  },
};

