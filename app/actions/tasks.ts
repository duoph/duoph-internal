"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser, canAccessTask, canEditTask, canManageTasks, canUpdateTaskStatus } from "@/lib/auth/authorization";
import { dbErrorMessage } from "@/lib/db/error-message";
import { taskService } from "@/lib/api/tasks";
import type { TaskPriority, TaskStatus } from "@/lib/types/database";
import { defaultDueDate } from "@/lib/utils/task-deadline";

const statuses: TaskStatus[] = ["todo", "in_progress", "in_review", "completed", "cancelled"];
const priorities: TaskPriority[] = ["low", "medium", "high", "urgent"];

const taskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(160),
  description: z.string().trim().max(5000).optional(),
  status: z.enum(statuses),
  priority: z.enum(priorities),
  assignee_ids: z.array(z.string()).max(20),
  client_id: z.string().optional(),
  due_date: z.string().optional(),
  tags: z.array(z.string()).max(12),
});

function revalidateTasks(scope: "task" | "all" = "all") {
  revalidatePath("/tasks");
  if (scope === "all") {
    revalidatePath("/analytics");
    revalidatePath("/dashboard");
  }
}

export async function createTaskAction(input: z.input<typeof taskSchema>) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };

  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid task." };

  try {
    const id = await taskService.create(
      {
        ...parsed.data,
        description: parsed.data.description ?? "",
        client_id: parsed.data.client_id?.trim() || null,
        due_date: parsed.data.due_date?.trim() || defaultDueDate(),
        assignee_ids: [...new Set(parsed.data.assignee_ids.filter(Boolean))],
        tags: [...new Set(parsed.data.tags.map((tag) => tag.trim()).filter(Boolean))],
      },
      user.id,
    );
    revalidateTasks();
    return { ok: true as const, id };
  } catch (error) {
    return { error: dbErrorMessage(error) };
  }
}

export async function updateTaskAction(
  id: string,
  input: Partial<z.input<typeof taskSchema>>,
) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };

  const current = await taskService.get(id);
  if (!current) return { error: "Task not found." };

  const parsed = taskSchema.partial().safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid task." };

  const statusChanging =
    parsed.data.status !== undefined && parsed.data.status !== current.status;
  if (statusChanging && !canUpdateTaskStatus(user, current)) {
    return { error: "You can only update the status of tasks assigned to you." };
  }

  const keys = Object.keys(parsed.data).filter((key) => key !== "status" || statusChanging);
  const statusOnly = keys.length === 1 && keys[0] === "status";
  if (!canEditTask(user, current) && !statusOnly) {
    return { error: "You can only update the status of tasks assigned to you." };
  }

  try {
    const next = {
      ...parsed.data,
      ...(parsed.data.description !== undefined ? { description: parsed.data.description ?? "" } : {}),
      ...(parsed.data.client_id !== undefined ? { client_id: parsed.data.client_id?.trim() || null } : {}),
      ...(parsed.data.due_date !== undefined ? { due_date: parsed.data.due_date?.trim() || null } : {}),
      ...(parsed.data.assignee_ids !== undefined
        ? { assignee_ids: [...new Set(parsed.data.assignee_ids.filter(Boolean))] }
        : {}),
      ...(parsed.data.tags !== undefined
        ? { tags: [...new Set(parsed.data.tags.map((tag) => tag.trim()).filter(Boolean))] }
        : {}),
    };
    if (!statusChanging) delete next.status;

    await taskService.update(id, next, user.id);
    const keys = Object.keys(parsed.data);
    const fieldPatch = keys.length > 0 && keys.every((key) => key === "status" || key === "priority");
    if (!fieldPatch) revalidateTasks("all");
    return { ok: true as const };
  } catch (error) {
    return { error: dbErrorMessage(error) };
  }
}

export async function deleteTaskAction(id: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };

  const current = await taskService.get(id);
  if (!current) return { error: "Task not found." };
  if (!canManageTasks(user) && current.created_by !== user.id) {
    return { error: "You can only delete tasks that you created." };
  }

  try {
    await taskService.softDelete(id, user.id);
    revalidateTasks();
    return { ok: true as const };
  } catch (error) {
    return { error: dbErrorMessage(error) };
  }
}

export async function getTaskActivityAction(id: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };

  const current = await taskService.get(id);
  if (!current || !canAccessTask(user, current)) {
    return { error: "You do not have permission to view this task." };
  }

  try {
    const activity = await taskService.activity(id);
    return { ok: true as const, activity };
  } catch (error) {
    return { error: dbErrorMessage(error) };
  }
}

