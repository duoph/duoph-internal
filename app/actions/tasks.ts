"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser, canManageTasks } from "@/lib/auth/authorization";
import { dbErrorMessage } from "@/lib/db/error-message";
import { taskService } from "@/lib/api/tasks";
import type { TaskPriority, TaskStatus } from "@/lib/types/database";

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

function revalidateTasks() {
  revalidatePath("/tasks");
  revalidatePath("/analytics");
  revalidatePath("/dashboard");
}

export async function createTaskAction(input: z.input<typeof taskSchema>) {
  const user = await getCurrentUser();
  if (!user || !canManageTasks(user)) return { error: "You do not have permission to create tasks." };

  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid task." };

  try {
    const id = await taskService.create(
      {
        ...parsed.data,
        description: parsed.data.description ?? "",
        client_id: parsed.data.client_id?.trim() || null,
        due_date: parsed.data.due_date?.trim() || null,
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

  if (!canManageTasks(user)) {
    const visible = await taskService.list({ viewerId: user.id, canViewAll: false });
    const task = visible.find((item) => item.id === id && item.assignee_ids.includes(user.id));
    if (!task) return { error: "You do not have permission to update this task." };
    const keys = Object.keys(input);
    if (keys.some((key) => key !== "status") || !input.status || !statuses.includes(input.status)) {
      return { error: "Members can only update task status." };
    }
  }

  const patchSchema = taskSchema.partial();
  const parsed = patchSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid task." };

  try {
    await taskService.update(
      id,
      {
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
      },
      user.id,
    );
    revalidateTasks();
    return { ok: true as const };
  } catch (error) {
    return { error: dbErrorMessage(error) };
  }
}

export async function deleteTaskAction(id: string) {
  const user = await getCurrentUser();
  if (!user || !canManageTasks(user)) return { error: "You do not have permission to delete tasks." };

  try {
    await taskService.softDelete(id, user.id);
    revalidateTasks();
    return { ok: true as const };
  } catch (error) {
    return { error: dbErrorMessage(error) };
  }
}

