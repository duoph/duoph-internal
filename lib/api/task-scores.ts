import "server-only";

import { COL, getDb } from "@/lib/db/mongodb";
import { listAllUsers } from "@/lib/auth/users";
import { roleForUser } from "@/lib/auth/authorization";
import { computeDeadlineRecord, memberScoreFromRates } from "@/lib/utils/task-deadline";
import type { DeadlineOutcome, TaskPriority, TaskStatus } from "@/lib/types/database";

export type TaskScoreDoc = {
  user_id: string;
  name: string;
  email: string;
  total: number;
  completed: number;
  active: number;
  overdue: number;
  missed: number;
  on_time: number;
  due_completed: number;
  completed_late: number;
  todo: number;
  in_progress: number;
  in_review: number;
  completed_7d: number;
  completed_30d: number;
  completion_hours_total: number;
  lateness_hours_total: number;
  score_points_total: number;
  scored_tasks: number;
  average_task_points: number;
  average_completion_hours: number;
  average_lateness_hours: number;
  completion_rate: number;
  on_time_rate: number;
  reliability: number;
  score: number;
  rank: number;
  computed_at: Date;
};

type ScoreTaskDoc = {
  status: TaskStatus;
  priority: TaskPriority;
  assignee_ids: string[];
  due_date: string | null;
  completed_at: Date | null;
  first_missed_at: Date | null;
  deadline_outcome?: DeadlineOutcome;
  completed_late?: boolean;
  days_late?: number | null;
  lateness_hours?: number | null;
  score_points?: number | null;
  created_at: Date;
  deleted_at: Date | null;
};

function emptyRow(user: { id: string; name: string; email: string }): Omit<TaskScoreDoc, "computed_at"> {
  return {
    user_id: user.id,
    name: user.name,
    email: user.email,
    total: 0,
    completed: 0,
    active: 0,
    overdue: 0,
    missed: 0,
    on_time: 0,
    due_completed: 0,
    completed_late: 0,
    todo: 0,
    in_progress: 0,
    in_review: 0,
    completed_7d: 0,
    completed_30d: 0,
    completion_hours_total: 0,
    lateness_hours_total: 0,
    score_points_total: 0,
    scored_tasks: 0,
    average_task_points: 0,
    average_completion_hours: 0,
    average_lateness_hours: 0,
    completion_rate: 0,
    on_time_rate: 0,
    reliability: 0,
    score: 0,
    rank: 0,
  };
}

export const taskScoreService = {
  async recompute() {
    const db = await getDb();
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const [users, tasks] = await Promise.all([
      listAllUsers(),
      db
        .collection<ScoreTaskDoc>(COL.tasks)
        .find({ deleted_at: null, status: { $ne: "cancelled" } })
        .toArray(),
    ]);

    const members = new Map<string, ReturnType<typeof emptyRow>>();
    for (const user of users) {
      if (user.disabled_at || roleForUser(user) === "admin") continue;
      const id = user._id.toString();
      members.set(
        id,
        emptyRow({
          id,
          name: user.admin_name.trim() || user.email.split("@")[0] || "User",
          email: user.email,
        }),
      );
    }

    for (const task of tasks) {
      const record = computeDeadlineRecord(
        {
          due_date: task.due_date,
          status: task.status,
          priority: task.priority,
          completed_at: task.completed_at,
          first_missed_at: task.first_missed_at,
        },
        now,
      );
      for (const assigneeId of task.assignee_ids) {
        const existing = members.get(assigneeId);
        const row =
          existing ??
          emptyRow({
            id: assigneeId,
            name: "Unknown",
            email: "",
          });
        row.total += 1;
        if (task.status === "completed") row.completed += 1;
        else row.active += 1;
        if (task.status === "todo") row.todo += 1;
        if (task.status === "in_progress") row.in_progress += 1;
        if (task.status === "in_review") row.in_review += 1;
        if (record.deadline_outcome === "open_overdue") row.overdue += 1;
        if (record.first_missed_at) row.missed += 1;
        if (record.deadline_outcome === "on_time") row.on_time += 1;
        if (task.status === "completed" && task.due_date) row.due_completed += 1;
        if (record.completed_late) row.completed_late += 1;
        if (record.score_points != null) {
          row.score_points_total += record.score_points;
          row.scored_tasks += 1;
        }
        if (task.status === "completed" && task.completed_at) {
          if (task.completed_at >= sevenDaysAgo) row.completed_7d += 1;
          if (task.completed_at >= thirtyDaysAgo) row.completed_30d += 1;
          row.completion_hours_total += Math.max(
            0,
            (task.completed_at.getTime() - task.created_at.getTime()) / (60 * 60 * 1000),
          );
          if (record.completed_late) {
            row.lateness_hours_total += record.lateness_hours ?? 0;
          }
        }
        members.set(assigneeId, row);
      }
    }

    const computedAt = new Date();
    const ranked = [...members.values()]
      .map((member) => {
        const completionRate = member.total ? Math.round((member.completed / member.total) * 100) : 0;
        const onTimeRate = member.due_completed
          ? Math.round((member.on_time / member.due_completed) * 100)
          : 0;
        const reliability = member.total
          ? Math.max(0, Math.round(100 - (member.missed / member.total) * 100))
          : 0;
        const averageTaskPoints = member.scored_tasks
          ? Math.round(member.score_points_total / member.scored_tasks)
          : null;
        return {
          ...member,
          average_task_points: averageTaskPoints ?? 0,
          average_completion_hours: member.completed
            ? Math.round(member.completion_hours_total / member.completed)
            : 0,
          average_lateness_hours: member.completed_late
            ? Math.round(member.lateness_hours_total / member.completed_late)
            : 0,
          completion_rate: completionRate,
          on_time_rate: onTimeRate,
          reliability,
          score: memberScoreFromRates({
            averageTaskPoints,
            completionRate,
            reliability,
            completed: member.completed,
          }),
          computed_at: computedAt,
        };
      })
      .sort((a, b) => b.score - a.score || b.completed - a.completed || a.missed - b.missed)
      .map((member, index) => ({ ...member, rank: index + 1 }));

    const ids = ranked.map((member) => member.user_id);
    if (ranked.length) {
      await db.collection<TaskScoreDoc>(COL.task_scores).bulkWrite(
        ranked.map((member) => ({
          replaceOne: {
            filter: { user_id: member.user_id },
            replacement: member,
            upsert: true,
          },
        })),
      );
    }
    await db.collection(COL.task_scores).deleteMany(ids.length ? { user_id: { $nin: ids } } : {});
    return ranked;
  },

  async list() {
    const db = await getDb();
    const rows = await db
      .collection<TaskScoreDoc>(COL.task_scores)
      .find({})
      .sort({ rank: 1 })
      .toArray();
    if (rows.length) return rows;
    return this.recompute();
  },
};
