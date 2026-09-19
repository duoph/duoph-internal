import "server-only";

import { ObjectId } from "mongodb";
import { COL, getDb } from "@/lib/db/mongodb";
import { toDateOnly, toId, toIso } from "@/lib/db/serialize";
import { clientService } from "@/lib/api/clients";
import { listAllUsers } from "@/lib/auth/users";
import type {
  TaskPriority,
  TaskRow,
  TaskStatus,
  TaskWithRelations,
} from "@/lib/types/database";

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

function deadlineFor(dueDate: string) {
  return new Date(`${dueDate}T23:59:59.999Z`);
}

function toRow(doc: TaskDoc): TaskRow {
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
    first_missed_at: toIso(doc.first_missed_at),
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
    const today = new Date().toISOString().slice(0, 10);
    const candidates = await db
      .collection<TaskDoc>(COL.tasks)
      .find({
        deleted_at: null,
        first_missed_at: null,
        due_date: { $ne: null, $lt: today },
        status: { $nin: ["cancelled"] },
      })
      .toArray();

    const missed = candidates.filter(
      (task) =>
        task.status !== "completed" ||
        !task.completed_at ||
        task.completed_at > deadlineFor(task.due_date!),
    );
    if (missed.length) {
      await db.collection<TaskDoc>(COL.tasks).updateMany(
        { _id: { $in: missed.map((task) => task._id) } },
        { $set: { first_missed_at: new Date() } },
      );
    }
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
    const firstMissedAt =
      input.due_date && input.status !== "cancelled" && now > deadlineFor(input.due_date) ? now : null;
    const doc = {
      ...input,
      created_by: actorId,
      completed_at: completedAt,
      first_missed_at: firstMissedAt,
      deleted_at: null,
      created_at: now,
      updated_at: now,
    };
    const result = await db.collection(COL.tasks).insertOne(doc);
    await recordActivity(result.insertedId.toString(), actorId, "created");
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
    const completedAt =
      nextStatus === "completed"
        ? current.completed_at ?? now
        : null;
    const firstMissedAt =
      current.first_missed_at ??
      (nextDueDate && nextStatus !== "cancelled" && now > deadlineFor(nextDueDate) ? now : null);

    await db.collection<TaskDoc>(COL.tasks).updateOne(
      { _id: current._id },
      {
        $set: {
          ...input,
          completed_at: completedAt,
          first_missed_at: firstMissedAt,
          updated_at: now,
        },
      },
    );
    await recordActivity(id, actorId, "updated", {
      previousStatus: current.status,
      status: nextStatus,
    });
  },

  async softDelete(id: string, actorId: string) {
    if (!ObjectId.isValid(id)) throw new Error("Task not found");
    const db = await getDb();
    await db
      .collection<TaskDoc>(COL.tasks)
      .updateOne({ _id: new ObjectId(id) }, { $set: { deleted_at: new Date(), updated_at: new Date() } });
    await recordActivity(id, actorId, "deleted");
  },
};

