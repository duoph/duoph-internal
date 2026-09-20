import type { DeadlineOutcome, TaskPriority, TaskStatus } from "@/lib/types/database";

export type DeadlineInput = {
  due_date: string | null;
  status: TaskStatus;
  priority?: TaskPriority;
  completed_at: Date | null;
  first_missed_at: Date | null;
};

export type DeadlineRecord = {
  first_missed_at: Date | null;
  deadline_outcome: DeadlineOutcome;
  completed_late: boolean;
  days_late: number | null;
  lateness_hours: number | null;
  score_points: number | null;
};

export function deadlineFor(dueDate: string) {
  return new Date(`${dueDate}T23:59:59.999Z`);
}

export function defaultDueDate(now = new Date()) {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function hoursBetween(later: Date, earlier: Date) {
  return Math.max(0, (later.getTime() - earlier.getTime()) / (60 * 60 * 1000));
}

function lateCompletionPoints(hoursLate: number) {
  const days = hoursLate / 24;
  return Math.max(30, Math.round(70 - days * 4));
}

function priorityWeight(priority?: TaskPriority) {
  if (priority === "urgent") return 1.15;
  if (priority === "high") return 1.08;
  if (priority === "low") return 0.92;
  return 1;
}

function weightedPoints(base: number, priority?: TaskPriority) {
  return Math.min(100, Math.round(base * priorityWeight(priority)));
}

export function computeDeadlineRecord(task: DeadlineInput, now = new Date()): DeadlineRecord {
  if (task.status === "cancelled") {
    return {
      first_missed_at: task.first_missed_at,
      deadline_outcome: "none",
      completed_late: false,
      days_late: null,
      lateness_hours: null,
      score_points: null,
    };
  }

  if (!task.due_date) {
    return {
      first_missed_at: task.first_missed_at,
      deadline_outcome: "none",
      completed_late: false,
      days_late: null,
      lateness_hours: null,
      score_points: task.status === "completed" ? weightedPoints(80, task.priority) : null,
    };
  }

  const deadline = deadlineFor(task.due_date);
  const completedAt = task.status === "completed" ? task.completed_at ?? now : null;
  const missedNow = completedAt ? completedAt > deadline : now > deadline;
  const firstMissedAt = task.first_missed_at ?? (missedNow ? deadline : null);
  const historicallyMissed = Boolean(firstMissedAt);

  if (task.status === "completed") {
    const late = historicallyMissed || Boolean(completedAt && completedAt > deadline);
    const hoursLate = late && completedAt ? hoursBetween(completedAt, deadline) : 0;
    return {
      first_missed_at: late ? firstMissedAt ?? deadline : null,
      deadline_outcome: late ? "late" : "on_time",
      completed_late: late,
      days_late: late ? Math.max(1, Math.ceil(hoursLate / 24)) : 0,
      lateness_hours: late ? Math.round(hoursLate) : 0,
      score_points: late
        ? weightedPoints(lateCompletionPoints(hoursLate), task.priority)
        : weightedPoints(100, task.priority),
    };
  }

  const currentlyOverdue = now > deadline;
  const hoursLate = currentlyOverdue ? hoursBetween(now, deadline) : 0;
  return {
    first_missed_at: historicallyMissed || currentlyOverdue ? firstMissedAt ?? deadline : null,
    deadline_outcome: currentlyOverdue ? "open_overdue" : "none",
    completed_late: false,
    days_late: currentlyOverdue ? Math.max(1, Math.ceil(hoursLate / 24)) : null,
    lateness_hours: currentlyOverdue ? Math.round(hoursLate) : null,
    score_points: currentlyOverdue ? 0 : null,
  };
}

export function memberScoreFromRates(input: {
  averageTaskPoints: number | null;
  completionRate: number;
  reliability: number;
  completed: number;
}) {
  if (input.averageTaskPoints == null && !input.completed) return 0;
  const volumeBoost = Math.min(8, input.completed * 0.4);
  const taskQuality = input.averageTaskPoints ?? 0;
  return Math.min(
    100,
    Math.round(taskQuality * 0.5 + input.completionRate * 0.3 + input.reliability * 0.2 + volumeBoost),
  );
}
