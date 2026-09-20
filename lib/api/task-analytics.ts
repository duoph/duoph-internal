import "server-only";

import { endOfWeek, format, startOfWeek, subWeeks } from "date-fns";
import { taskService } from "@/lib/api/tasks";
import { taskScoreService } from "@/lib/api/task-scores";
import type { TaskScoreDoc } from "@/lib/api/task-scores";

export type TaskAnalyticsAccess = {
  viewerId: string;
  canViewAll: boolean;
};

function toMember(doc: TaskScoreDoc) {
  return {
    id: doc.user_id,
    name: doc.name,
    email: doc.email,
    total: doc.total,
    completed: doc.completed,
    active: doc.active,
    overdue: doc.overdue,
    missed: doc.missed,
    onTime: doc.on_time,
    dueCompleted: doc.due_completed,
    completedLate: doc.completed_late,
    todo: doc.todo,
    inProgress: doc.in_progress,
    inReview: doc.in_review,
    completed7d: doc.completed_7d,
    completed30d: doc.completed_30d,
    averageCompletionHours: doc.average_completion_hours,
    averageLatenessHours: doc.average_lateness_hours,
    averageTaskPoints: doc.average_task_points,
    completionRate: doc.completion_rate,
    onTimeRate: doc.on_time_rate,
    reliability: doc.reliability,
    score: doc.score,
    rank: doc.rank,
  };
}

export const taskAnalyticsService = {
  async get(access: TaskAnalyticsAccess) {
    await taskService.reconcileMissedDeadlines();
    const [tasks, scoreDocs] = await Promise.all([
      taskService.list(access),
      taskScoreService.list(),
    ]);
    const relevant = tasks.filter((task) => task.status !== "cancelled");
    const completed = relevant.filter((task) => task.status === "completed");
    const missed = relevant.filter((task) => Boolean(task.first_missed_at));
    const overdue = relevant.filter((task) => task.deadline_outcome === "open_overdue");
    const lateCompletions = relevant
      .filter((task) => task.completed_late)
      .sort((a, b) => (b.days_late ?? 0) - (a.days_late ?? 0));
    const active = relevant.filter((task) => task.status !== "completed");
    const now = new Date();

    const members = (access.canViewAll ? scoreDocs : scoreDocs.filter((doc) => doc.user_id === access.viewerId))
      .map(toMember);

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

    const scoredMembers = members.filter((member) => member.total > 0);
    const dueCompleted = completed.filter((task) => Boolean(task.due_date)).length;
    const onTime = completed.filter((task) => task.deadline_outcome === "on_time").length;

    return {
      summary: {
        total: relevant.length,
        active: active.length,
        completed: completed.length,
        overdue: overdue.length,
        missed: missed.length,
        completionRate: relevant.length ? Math.round((completed.length / relevant.length) * 100) : 0,
        onTime,
        completedLate: lateCompletions.length,
        onTimeRate: dueCompleted
          ? Math.round((onTime / dueCompleted) * 100)
          : 0,
        averageScore: scoredMembers.length
          ? Math.round(scoredMembers.reduce((sum, member) => sum + member.score, 0) / scoredMembers.length)
          : 0,
      },
      completionTrend,
      byStatus,
      members,
      topPerformer: members.find((member) => member.score > 0) ?? null,
      attention: overdue
        .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))
        .slice(0, 8),
      lateCompletions: lateCompletions.slice(0, 8).map((task) => ({
        id: task.id,
        title: task.title,
        due_date: task.due_date,
        completed_at: task.completed_at,
        days_late: task.days_late,
        score_points: task.score_points,
        assignees: task.assignees,
      })),
    };
  },
};
