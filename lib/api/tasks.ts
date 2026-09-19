import "server-only";

import { ObjectId } from "mongodb";
import { COL, getDb } from "@/lib/db/mongodb";
import { toDateOnly, toId, toIso } from "@/lib/db/serialize";
import { clientService } from "@/lib/api/clients";
import { listAllUsers } from "@/lib/auth/users";
import type {
  DeadlineOutcome,
  TaskPriority,
  TaskActivityRow,
  TaskRow,
  TaskStatus,
  TaskWithRelations,
} from "@/lib/types/database";
import { computeDeadlineRecord } from "@/lib/utils/task-deadline";
import { taskScoreService } from "@/lib/api/task-scores";

type TaskDoc = {
  _id: ObjectId;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_ids: string[];
  client_id: string | null;
  created_by: string;
  due_date: string | null;
  completed_at: Date | null;
  first_missed_at: Date | null;
  deadline_outcome?: DeadlineOutcome;
  completed_late?: boolean;
  days_late?: number | null;
  lateness_hours?: number | null;
  score_points?: number | null;
  tags: string[];
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type TaskListParams = {
  viewerId: string;
  canViewAll: boolean;
  q?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
  clientId?: string;
};

export type TaskInput = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_ids: string[];
  client_id: string | null;
  due_date: string | null;
  tags: string[];
};

function deadlineFields(input: {
  due_date: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  completed_at: Date | null;
  first_missed_at: Date | null;
}, now = new Date()) {
  const record = computeDeadlineRecord(input, now);
  return {
    first_missed_at: input.first_missed_at ?? record.first_missed_at,
    deadline_outcome: record.deadline_outcome,
    completed_late: record.completed_late,
    days_late: record.days_late,
    lateness_hours: record.lateness_hours,
    score_points: record.score_points,
  };
}

function toRow(doc: TaskDoc): TaskRow {
  const record = deadlineFields({
    due_date: toDateOnly(doc.due_date),
    status: doc.status,
    priority: doc.priority,
    completed_at: doc.completed_at,
    first_missed_at: doc.first_missed_at,
  });
  return {
    id: toId(doc._id),
    title: doc.title,
    description: doc.description,
    status: doc.status,
    priority: doc.priority,
    assignee_ids: doc.assignee_ids,
    client_id: doc.client_id,
    created_by: doc.created_by,
    due_date: toDateOnly(doc.due_date),
    completed_at: toIso(doc.completed_at),
    first_missed_at: toIso(doc.first_missed_at ?? record.first_missed_at),
    deadline_outcome: doc.deadline_outcome ?? record.deadline_outcome,
    completed_late: doc.completed_late ?? record.completed_late,
    days_late: doc.days_late ?? record.days_late,
    lateness_hours: doc.lateness_hours ?? record.lateness_hours,
    score_points: doc.score_points ?? record.score_points,
    tags: doc.tags,
    deleted_at: toIso(doc.deleted_at),
    created_at: toIso(doc.created_at)!,
    updated_at: toIso(doc.updated_at)!,
  };
}

async function hydrate(docs: TaskDoc[]): Promise<TaskWithRelations[]> {
  const [users, clients] = await Promise.all([
    listAllUsers(),
    clientService.getManyByIds(
      docs.map((doc) => doc.client_id).filter((id): id is string => Boolean(id)),
    ),
  ]);
  const userMap = new Map(
    users.map((user) => [
      user._id.toString(),
      {
        id: user._id.toString(),
        name: user.admin_name.trim() || user.email.split("@")[0] || "User",
        email: user.email,
      },
    ]),
  );

  return docs.map((doc) => {
    const row = toRow(doc);
    const client = doc.client_id ? clients.get(doc.client_id) : null;
    const creator = userMap.get(doc.created_by);
    return {
      ...row,
      assignees: doc.assignee_ids.map((id) => userMap.get(id)).filter((user) => Boolean(user)),
      client: client ? { id: client.id, client_name: client.client_name } : null,
      creator: creator ? { id: creator.id, name: creator.name } : null,
    } as TaskWithRelations;
  });
}

async function recordActivity(taskId: string, actorId: string, action: string, details?: Record<string, unknown>) {
  const db = await getDb();
  await db.collection(COL.task_activity).insertOne({
    task_id: taskId,
    actor_id: actorId,
    action,
    details: details ?? {},
    created_at: new Date(),
  });
}

export const taskService = {
  async reconcileMissedDeadlines() {
    const db = await getDb();
    const now = new Date();
    const tasks = await db
      .collection<TaskDoc>(COL.tasks)
      .find({ deleted_at: null, status: { $ne: "cancelled" } })
      .toArray();

    const writes = tasks.flatMap((task) => {
      const next = deadlineFields(
        {
          due_date: task.due_date,
          status: task.status,
          priority: task.priority,
          completed_at: task.completed_at,
          first_missed_at: task.first_missed_at,
        },
        now,
      );
      const unchanged =
        toIso(task.first_missed_at) === toIso(next.first_missed_at) &&
        task.deadline_outcome === next.deadline_outcome &&
        Boolean(task.completed_late) === next.completed_late &&
        task.days_late === next.days_late &&
        task.lateness_hours === next.lateness_hours &&
        task.score_points === next.score_points;
      if (unchanged) return [];
      return [
        {
          updateOne: {
            filter: { _id: task._id },
            update: { $set: next },
          },
        },
      ];
    });

    if (writes.length) {
      await db.collection<TaskDoc>(COL.tasks).bulkWrite(writes);
    }
    await taskScoreService.recompute();
  },

  async list(params: TaskListParams): Promise<TaskWithRelations[]> {
    await this.reconcileMissedDeadlines();
    const filter: Record<string, unknown> = { deleted_at: null };
    if (!params.canViewAll) {
      filter.$or = [{ assignee_ids: params.viewerId }, { created_by: params.viewerId }];
    }
    if (params.status?.trim()) filter.status = params.status.trim();
    if (params.priority?.trim()) filter.priority = params.priority.trim();
    if (params.assigneeId?.trim()) filter.assignee_ids = params.assigneeId.trim();
    if (params.clientId?.trim()) filter.client_id = params.clientId.trim();
    if (params.q?.trim()) {
      const search = params.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const textFilter = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $regex: search, $options: "i" } },
      ];
      if (filter.$or) filter.$and = [{ $or: filter.$or }, { $or: textFilter }];
      else filter.$or = textFilter;
    }

    const db = await getDb();
    const docs = await db
      .collection<TaskDoc>(COL.tasks)
      .find(filter)
      .sort({ status: 1, due_date: 1, priority: -1, created_at: -1 })
      .toArray();
    return hydrate(docs);
  },

  async create(input: TaskInput, actorId: string) {
    const db = await getDb();
    const now = new Date();
    const completedAt = input.status === "completed" ? now : null;
    const deadline = deadlineFields({
      due_date: input.due_date,
      status: input.status,
      priority: input.priority,
      completed_at: completedAt,
      first_missed_at: null,
    }, now);
    const doc = {
      ...input,
      created_by: actorId,
      completed_at: completedAt,
      ...deadline,
      deleted_at: null,
      created_at: now,
      updated_at: now,
    };
    const result = await db.collection(COL.tasks).insertOne(doc);
    await recordActivity(result.insertedId.toString(), actorId, "created", {
      status: input.status,
      priority: input.priority,
      assigneeIds: input.assignee_ids,
      dueDate: input.due_date,
      completedLate: deadline.completed_late,
      deadlineOutcome: deadline.deadline_outcome,
      daysLate: deadline.days_late,
      scorePoints: deadline.score_points,
    });
    await taskScoreService.recompute();
    return result.insertedId.toString();
  },

  async update(id: string, input: Partial<TaskInput>, actorId: string) {
    if (!ObjectId.isValid(id)) throw new Error("Task not found");
    const db = await getDb();
    const current = await db.collection<TaskDoc>(COL.tasks).findOne({ _id: new ObjectId(id), deleted_at: null });
    if (!current) throw new Error("Task not found");

    const now = new Date();
    const nextStatus = input.status ?? current.status;
    const nextDueDate = input.due_date !== undefined ? input.due_date : current.due_date;
    const nextPriority = input.priority ?? current.priority;
    const completedAt =
      nextStatus === "completed"
        ? current.completed_at ?? now
        : current.completed_at;
    const deadline = deadlineFields({
      due_date: nextDueDate,
      status: nextStatus,
      priority: nextPriority,
      completed_at: completedAt,
      first_missed_at: current.first_missed_at,
    }, now);
    const changedFields = Object.keys(input).filter((key) => {
      const previous = current[key as keyof TaskDoc];
      const next = input[key as keyof TaskInput];
      return JSON.stringify(previous) !== JSON.stringify(next);
    });

    await db.collection<TaskDoc>(COL.tasks).updateOne(
      { _id: current._id },
      {
        $set: {
          ...input,
          completed_at: completedAt,
          ...deadline,
          updated_at: now,
        },
      },
    );
    await recordActivity(id, actorId, "updated", {
      changedFields,
      previousStatus: current.status,
      status: nextStatus,
      previousAssigneeIds: current.assignee_ids,
      assigneeIds: input.assignee_ids ?? current.assignee_ids,
      previousDueDate: current.due_date,
      dueDate: nextDueDate,
      priority: nextPriority,
      completedLate: deadline.completed_late,
      deadlineOutcome: deadline.deadline_outcome,
      daysLate: deadline.days_late,
      scorePoints: deadline.score_points,
    });
    await taskScoreService.recompute();
  },

  async activity(taskId: string): Promise<TaskActivityRow[]> {
    const db = await getDb();
    const [events, users] = await Promise.all([
      db
        .collection<{
          _id: ObjectId;
          task_id: string;
          actor_id: string;
          action: TaskActivityRow["action"];
          details: TaskActivityRow["details"];
          created_at: Date;
        }>(COL.task_activity)
        .find({ task_id: taskId })
        .sort({ created_at: -1 })
        .toArray(),
      listAllUsers(),
    ]);
    const userMap = new Map(
      users.map((user) => [
        user._id.toString(),
        {
          id: user._id.toString(),
          name: user.admin_name.trim() || user.email.split("@")[0] || "User",
        },
      ]),
    );
    return events.map((event) => ({
      id: event._id.toString(),
      task_id: event.task_id,
      actor_id: event.actor_id,
      actor: userMap.get(event.actor_id) ?? null,
      action: event.action,
      details: event.details ?? {},
      created_at: event.created_at.toISOString(),
    }));
  },

  async softDelete(id: string, actorId: string) {
    if (!ObjectId.isValid(id)) throw new Error("Task not found");
    const db = await getDb();
    await db
      .collection<TaskDoc>(COL.tasks)
      .updateOne({ _id: new ObjectId(id) }, { $set: { deleted_at: new Date(), updated_at: new Date() } });
    await recordActivity(id, actorId, "deleted");
    await taskScoreService.recompute();
  },
};

