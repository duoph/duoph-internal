"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createTaskAction,
  deleteTaskAction,
  getTaskActivityAction,
  updateTaskAction,
} from "@/app/actions/tasks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeaderActions } from "@/components/layout/page-chrome";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type {
  TaskActivityRow,
  TaskPriority,
  TaskStatus,
  TaskWithRelations,
} from "@/lib/types/database";

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "in_review", label: "In review" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const priorityOptions: { value: TaskPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const priorityStyles: Record<TaskPriority, string> = {
  low: "border-slate-200 bg-slate-50 text-slate-600",
  medium: "border-emerald-200 bg-emerald-50 text-[var(--color-primary)]",
  high: "border-amber-200 bg-amber-50 text-amber-700",
  urgent: "border-rose-200 bg-rose-50 text-rose-700",
};

function isOverdue(task: TaskWithRelations, today: string) {
  return Boolean(
    task.due_date &&
      task.due_date < today &&
      task.status !== "completed" &&
      task.status !== "cancelled",
  );
}

function dateInDays(today: string, days: number) {
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

type UserOption = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "member";
  activeTasks: number;
};
type ClientOption = { id: string; client_name: string };

export function TaskView({
  tasks,
  users,
  clients,
  canManage,
  currentUserId,
  filters,
  today,
}: {
  tasks: TaskWithRelations[];
  users: UserOption[];
  clients: ClientOption[];
  canManage: boolean;
  currentUserId: string;
  filters: { q?: string; status?: string; priority?: string; assignee?: string };
  today: string;
}) {
  const router = useRouter();
  const [editor, setEditor] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<TaskWithRelations | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TaskWithRelations | null>(null);
  const [detailTask, setDetailTask] = useState<TaskWithRelations | null>(null);
  const [activity, setActivity] = useState<TaskActivityRow[] | null>(null);
  const [scope, setScope] = useState<"all" | "assigned" | "created">(canManage ? "all" : "assigned");

  const active = tasks.filter((task) => task.status !== "completed" && task.status !== "cancelled").length;
  const overdue = tasks.filter((task) => isOverdue(task, today)).length;
  const dueSoon = tasks.filter((task) => {
    if (!task.due_date || task.status === "completed" || task.status === "cancelled") return false;
    const diff =
      new Date(`${task.due_date}T23:59:59Z`).getTime() -
      new Date(`${today}T00:00:00Z`).getTime();
    return diff >= 0 && diff <= 3 * 24 * 60 * 60 * 1000;
  }).length;
  const scopedTasks = tasks.filter((task) => {
    if (scope === "all") return true;
    if (scope === "assigned") return task.assignee_ids.includes(currentUserId);
    return task.created_by === currentUserId;
  });
  const nextWeek = dateInDays(today, 7);
  const taskGroups = [
    {
      key: "overdue",
      label: "Overdue",
      rows: scopedTasks.filter((task) => isOverdue(task, today)),
    },
    {
      key: "week",
      label: "This week",
      rows: scopedTasks.filter(
        (task) =>
          task.status !== "completed" &&
          task.status !== "cancelled" &&
          Boolean(task.due_date && task.due_date >= today && task.due_date <= nextWeek),
      ),
    },
    {
      key: "later",
      label: "Later",
      rows: scopedTasks.filter(
        (task) =>
          task.status !== "completed" &&
          task.status !== "cancelled" &&
          Boolean(task.due_date && task.due_date > nextWeek),
      ),
    },
    {
      key: "undated",
      label: "No due date",
      rows: scopedTasks.filter(
        (task) =>
          task.status !== "completed" &&
          task.status !== "cancelled" &&
          !task.due_date,
      ),
    },
    {
      key: "completed",
      label: "Completed",
      rows: scopedTasks.filter((task) => task.status === "completed"),
    },
    {
      key: "cancelled",
      label: "Cancelled",
      rows: scopedTasks.filter((task) => task.status === "cancelled"),
    },
  ].filter((group) => group.rows.length > 0);
  const hasFilters = Boolean(filters.q || filters.status || filters.priority || filters.assignee);

  function applyFilters(formData: FormData) {
    const params = new URLSearchParams();
    for (const key of ["q", "status", "priority", "assignee"]) {
      const value = String(formData.get(key) ?? "").trim();
      if (value) params.set(key, value);
    }
    router.push(`/tasks${params.size ? `?${params.toString()}` : ""}`);
  }

  async function openTaskDetail(task: TaskWithRelations) {
    setDetailTask(task);
    setActivity(null);
    const result = await getTaskActivityAction(task.id);
    if (!("activity" in result) || !result.activity) {
      toast.error("error" in result && result.error ? result.error : "Could not load task activity.");
      setActivity([]);
      return;
    }
    setActivity(result.activity);
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <PageHeaderActions>
        <Button type="button" className="h-9 px-3.5 py-0 text-xs" onClick={() => setEditor("create")}>
          <span aria-hidden>＋</span> New task
        </Button>
      </PageHeaderActions>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden p-0 shadow-none">
        <div className="flex shrink-0 items-center justify-between gap-4 overflow-x-auto border-b border-[var(--color-border-subtle)] px-3 py-2">
          <div className="flex shrink-0 items-center gap-1 rounded-lg bg-slate-100 p-1">
            {([
              ...(canManage ? [{ key: "all" as const, label: "All tasks", count: tasks.length }] : []),
              {
                key: "assigned" as const,
                label: "Assigned to me",
                count: tasks.filter((task) => task.assignee_ids.includes(currentUserId)).length,
              },
              {
                key: "created" as const,
                label: "Assigned by me",
                count: tasks.filter((task) => task.created_by === currentUserId).length,
              },
            ]).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setScope(item.key)}
                className={cn(
                  "whitespace-nowrap rounded-md px-3 py-1.5 text-[11px] font-semibold transition",
                  scope === item.key
                    ? "bg-white text-[var(--color-primary)] shadow-sm"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]",
                )}
              >
                {item.label} <span className="ml-1 font-normal">{item.count}</span>
              </button>
            ))}
          </div>
        <form action={applyFilters} className="flex shrink-0 items-center gap-1.5">
          <div className="w-48">
            <Input name="q" defaultValue={filters.q} placeholder="Search tasks…" aria-label="Search tasks" className="h-9 py-1.5 text-xs" />
          </div>
          <div className="w-32">
          <Select name="status" defaultValue={filters.status ?? ""} aria-label="Filter by status" className="h-9 py-1.5 text-xs">
            <option value="">All statuses</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
          </div>
          <div className="w-28">
          <Select name="priority" defaultValue={filters.priority ?? ""} aria-label="Filter by priority" className="h-9 py-1.5 text-xs">
            <option value="">All priorities</option>
            {priorityOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
          </div>
          <input type="hidden" name="assignee" value={filters.assignee ?? ""} />
          <Button type="submit" variant="secondary" className="h-9 px-3 py-1.5 text-xs">Apply</Button>
          {hasFilters ? (
            <Button
              type="button"
              variant="ghost"
              className="h-9 px-2 py-1.5 text-xs"
              onClick={() => router.push("/tasks")}
            >
              Clear
            </Button>
          ) : null}
        </form>
        </div>

        <div className="hidden shrink-0 grid-cols-[minmax(280px,1fr)_minmax(150px,0.45fr)_120px_140px_64px] gap-4 border-b border-[var(--color-border-subtle)] bg-slate-50/60 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)] lg:grid">
          <span>Task</span>
          <span>Person</span>
          <span>Due date</span>
          <span>Status</span>
          <span />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {taskGroups.length ? taskGroups.map((group) => (
            <section key={group.key}>
              <div className="sticky top-0 z-10 flex items-center gap-2 border-y border-[var(--color-border-subtle)] bg-slate-50 px-4 py-2">
                <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">{group.label}</h2>
                <span className="text-[10px] text-[var(--color-text-muted)]">{group.rows.length}</span>
              </div>
              {group.rows.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  canManage={canManage || task.created_by === currentUserId}
                  canUpdateStatus={
                    canManage ||
                    task.created_by === currentUserId ||
                    task.assignee_ids.includes(currentUserId)
                  }
                  today={today}
                  onEdit={() => {
                    setSelected(task);
                    setEditor("edit");
                  }}
                  onOpen={() => void openTaskDetail(task)}
                  onDelete={() => setDeleteTarget(task)}
                />
              ))}
            </section>
          )) : (
            <div className="flex h-full min-h-56 flex-col items-center justify-center text-center">
              <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">✓</span>
              <h2 className="text-sm font-semibold">No tasks in this view</h2>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">Create a task or change the current filters.</p>
            </div>
          )}
        </div>
      </Card>

      <TaskEditor
        key={selected?.id ?? editor ?? "closed"}
        open={editor !== null}
        task={editor === "edit" ? selected : null}
        users={users}
        clients={clients}
        onClose={() => {
          setEditor(null);
          setSelected(null);
        }}
      />

      <TaskDetailModal
        open={Boolean(detailTask)}
        task={detailTask}
        activity={activity}
        canManage={canManage || detailTask?.created_by === currentUserId}
        onClose={() => {
          setDetailTask(null);
          setActivity(null);
        }}
        onEdit={() => {
          if (!detailTask) return;
          setSelected(detailTask);
          setDetailTask(null);
          setEditor("edit");
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this task?"
        description={deleteTarget ? `“${deleteTarget.title}” will be removed from the workspace.` : ""}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          const result = await deleteTaskAction(deleteTarget.id);
          if (result.error) throw new Error(result.error);
          toast.success("Task deleted");
          setDeleteTarget(null);
          router.refresh();
        }}
      />
    </div>
  );
}

function TaskRow({
  task,
  canManage,
  canUpdateStatus,
  today,
  onEdit,
  onOpen,
  onDelete,
}: {
  task: TaskWithRelations;
  canManage: boolean;
  canUpdateStatus: boolean;
  today: string;
  onEdit: () => void;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const overdue = isOverdue(task, today);

  function changeStatus(status: TaskStatus) {
    startTransition(async () => {
      const result = await updateTaskAction(task.id, { status });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div
      className="group grid cursor-pointer gap-3 border-b border-[var(--color-border-subtle)] px-4 py-3 transition hover:bg-slate-50/70 lg:grid-cols-[minmax(280px,1fr)_minmax(150px,0.45fr)_120px_140px_64px] lg:items-center lg:gap-4"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) onOpen();
      }}
    >
      <div className="flex min-w-0 items-start gap-3">
        <button
          type="button"
          disabled={!canUpdateStatus || pending}
          onClick={(event) => {
            event.stopPropagation();
            changeStatus(task.status === "completed" ? "todo" : "completed");
          }}
          className={cn(
            "mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px]",
            task.status === "completed"
              ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
              : "border-[var(--color-border-default)] bg-white text-transparent",
          )}
          aria-label={task.status === "completed" ? `Mark ${task.title} incomplete` : `Complete ${task.title}`}
        >
          ✓
        </button>
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="text-[9px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
              {task.id.slice(-6).toUpperCase()}
            </span>
            {task.priority !== "medium" ? <Badge className={cn("px-1.5 py-0 text-[9px]", priorityStyles[task.priority])}>{task.priority}</Badge> : null}
            {task.completed_late ? (
              <Badge className="border-amber-200 bg-amber-50 px-1.5 py-0 text-[9px] text-amber-800">
                Completed late{task.days_late ? ` · ${task.days_late}d` : ""}
              </Badge>
            ) : task.first_missed_at ? (
              <Badge className="border-rose-200 bg-rose-50 px-1.5 py-0 text-[9px] text-rose-700">Missed</Badge>
            ) : null}
          </div>
          <p className={cn("truncate text-sm font-medium", task.status === "completed" && "text-[var(--color-text-muted)] line-through")}>
            {task.title}
          </p>
          {task.description ? <p className="mt-0.5 truncate text-[11px] text-[var(--color-text-muted)]">{task.description}</p> : null}
          {task.client ? <p className="mt-0.5 truncate text-[10px] text-[var(--color-primary)]">{task.client.client_name}</p> : null}
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-2">
        {task.assignees.slice(0, 2).map((user) => (
          <span
            key={user.id}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[9px] font-bold text-[var(--color-primary)]"
            title={user.name}
          >
            {user.name.slice(0, 2).toUpperCase()}
          </span>
        ))}
        <span className="truncate text-xs text-[var(--color-text-secondary)]">
          {task.assignees.length ? task.assignees.map((user) => user.name).join(", ") : "Unassigned"}
        </span>
      </div>

      <div>
        <span className={cn(
          "inline-flex rounded-md px-2 py-1 text-[10px] font-medium",
          overdue
            ? "bg-rose-50 text-rose-700"
            : task.due_date
              ? "bg-slate-100 text-[var(--color-text-secondary)]"
              : "text-[var(--color-text-muted)]",
        )}>
          {task.due_date ? formatDate(task.due_date) : "No date"}
        </span>
      </div>

      <Select
        value={task.status}
        disabled={!canUpdateStatus || pending}
        className="w-full py-1.5 text-xs"
        aria-label={`Status for ${task.title}`}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => changeStatus(event.target.value as TaskStatus)}
      >
        {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </Select>

      <div className="flex justify-end gap-1">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onEdit();
          }}
          className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-text-muted)] hover:bg-white hover:text-[var(--color-primary)]"
          aria-label={`Edit ${task.title}`}
        >
          ›
        </button>
        {canManage ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            className="hidden h-8 w-8 items-center justify-center rounded-md text-rose-500 hover:bg-rose-50 group-hover:flex"
            aria-label={`Delete ${task.title}`}
          >
            ×
          </button>
        ) : null}
      </div>
    </div>
  );
}

function TaskDetailModal({
  open,
  task,
  activity,
  canManage,
  onClose,
  onEdit,
}: {
  open: boolean;
  task: TaskWithRelations | null;
  activity: TaskActivityRow[] | null;
  canManage: boolean;
  onClose: () => void;
  onEdit: () => void;
}) {
  if (!task) return null;

  const statusLabel = statusOptions.find((option) => option.value === task.status)?.label ?? task.status;
  const dateTime = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat("en", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(value))
      : "—";

  function eventSummary(event: TaskActivityRow) {
    if (event.action === "created") {
      const count = event.details.assigneeIds?.length ?? 0;
      return count ? `Created and assigned to ${count} ${count === 1 ? "person" : "people"}` : "Created task";
    }
    if (
      event.details.previousStatus &&
      event.details.status &&
      event.details.previousStatus !== event.details.status
    ) {
      const from = statusOptions.find((option) => option.value === event.details.previousStatus)?.label;
      const to = statusOptions.find((option) => option.value === event.details.status)?.label;
      if (event.details.status === "completed" && event.details.completedLate) {
        const days = event.details.daysLate;
        return `Completed after the deadline${days ? ` (${days} day${days === 1 ? "" : "s"} late)` : ""}`;
      }
      return `Changed status from ${from} to ${to}`;
    }
    const fields = event.details.changedFields ?? [];
    if (fields.includes("assignee_ids")) return "Updated task assignees";
    if (fields.includes("due_date")) return "Changed the due date";
    if (fields.length) return `Updated ${fields.join(", ").replaceAll("_", " ")}`;
    return "Updated task";
  }

  return (
    <Modal open={open} title="Task details" onClose={onClose} className="max-w-3xl">
      <div className="space-y-6">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge className={priorityStyles[task.priority]}>{task.priority} priority</Badge>
            <Badge className="border-emerald-200 bg-emerald-50 text-[var(--color-primary)]">{statusLabel}</Badge>
            {task.completed_late ? (
              <Badge className="border-amber-200 bg-amber-50 text-amber-800">
                Completed late{task.days_late ? ` · ${task.days_late} day${task.days_late === 1 ? "" : "s"}` : ""}
              </Badge>
            ) : task.first_missed_at ? (
              <Badge className="border-rose-200 bg-rose-50 text-rose-700">Missed deadline</Badge>
            ) : null}
          </div>
          <h2 className="text-xl font-semibold tracking-tight">{task.title}</h2>
          {task.description ? (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--color-text-secondary)]">{task.description}</p>
          ) : <p className="mt-2 text-sm text-[var(--color-text-muted)]">No description provided.</p>}
        </div>

        <div className="grid gap-px overflow-hidden rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-border-subtle)] sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Assigned by", value: task.creator?.name ?? "Unknown" },
            { label: "Assigned at", value: dateTime(task.created_at) },
            { label: "Due date", value: task.due_date ? formatDate(task.due_date) : "No due date" },
            { label: "Completed", value: dateTime(task.completed_at) },
            { label: "Deadline record", value: task.completed_late ? `Late · ${task.days_late ?? 0}d · ${task.score_points ?? 0} pts` : task.first_missed_at ? "Missed" : task.deadline_outcome === "on_time" ? "On time" : "—" },
            { label: "Score points", value: task.score_points == null ? "—" : String(task.score_points) },
          ].map((item) => (
            <div key={item.label} className="bg-white p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{item.label}</p>
              <p className="mt-1 text-xs font-medium">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className="field-label">Assigned to</p>
            <div className="space-y-2">
              {task.assignees.length ? task.assignees.map((assignee) => (
                <div key={assignee.id} className="flex items-center gap-3 rounded-lg bg-slate-50 p-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[10px] font-bold text-[var(--color-primary)]">
                    {assignee.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold">{assignee.name}</span>
                    <span className="block truncate text-[10px] text-[var(--color-text-muted)]">{assignee.email}</span>
                  </span>
                </div>
              )) : <p className="text-xs text-[var(--color-text-muted)]">Unassigned</p>}
            </div>
          </div>
          <div>
            <p className="field-label">Context</p>
            <dl className="space-y-2 rounded-lg bg-slate-50 p-3 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--color-text-muted)]">Client</dt>
                <dd className="text-right font-medium">{task.client?.client_name ?? "Internal"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--color-text-muted)]">Last updated</dt>
                <dd className="text-right font-medium">{dateTime(task.updated_at)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--color-text-muted)]">Task ID</dt>
                <dd className="font-mono text-[10px]">{task.id}</dd>
              </div>
            </dl>
          </div>
        </div>

        {task.tags.length ? (
          <div className="flex flex-wrap gap-1.5">
            {task.tags.map((tag) => <span key={tag} className="rounded-md bg-slate-100 px-2 py-1 text-[10px] text-slate-600">#{tag}</span>)}
          </div>
        ) : null}

        <div>
          <p className="field-label">Activity</p>
          <div className="max-h-48 overflow-y-auto rounded-xl border border-[var(--color-border-subtle)]">
            {activity === null ? (
              <p className="p-4 text-xs text-[var(--color-text-muted)]">Loading activity…</p>
            ) : activity.length ? (
              <div className="divide-y divide-[var(--color-border-subtle)]">
                {activity.map((event) => (
                  <div key={event.id} className="flex gap-3 p-3">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--color-primary)]" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium">{eventSummary(event)}</p>
                      <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
                        {event.actor?.name ?? "Unknown user"} · {dateTime(event.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="p-4 text-xs text-[var(--color-text-muted)]">No recorded activity yet.</p>}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
          {canManage ? <Button type="button" onClick={onEdit}>Edit task</Button> : null}
        </div>
      </div>
    </Modal>
  );
}

function TaskEditor({
  open,
  task,
  users,
  clients,
  onClose,
}: {
  open: boolean;
  task: TaskWithRelations | null;
  users: UserOption[];
  clients: ClientOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [assignees, setAssignees] = useState<string[]>(task?.assignee_ids ?? []);

  return (
    <Modal open={open} title={task ? "Edit task" : "Create task"} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          const input = {
            title: String(formData.get("title") ?? ""),
            description: String(formData.get("description") ?? ""),
            status: String(formData.get("status") ?? "todo") as TaskStatus,
            priority: String(formData.get("priority") ?? "medium") as TaskPriority,
            assignee_ids: assignees,
            client_id: String(formData.get("client_id") ?? ""),
            due_date: String(formData.get("due_date") ?? ""),
            tags: String(formData.get("tags") ?? "").split(",").map((tag) => tag.trim()).filter(Boolean),
          };
          startTransition(async () => {
            const result = task
              ? await updateTaskAction(task.id, input)
              : await createTaskAction(input);
            if (result.error) {
              toast.error(result.error);
              return;
            }
            toast.success(task ? "Task updated" : "Task created");
            onClose();
            router.refresh();
          });
        }}
      >
        <div>
          <label className="field-label" htmlFor="task-title">Title</label>
          <Input id="task-title" name="title" required defaultValue={task?.title ?? ""} placeholder="What needs to be done?" />
        </div>
        <div>
          <label className="field-label" htmlFor="task-description">Description</label>
          <textarea
            id="task-description"
            name="description"
            defaultValue={task?.description ?? ""}
            rows={4}
            placeholder="Add context, deliverables, or links…"
            className="w-full resize-y rounded-[var(--radius-control)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-3 py-2.5 text-sm outline-none transition focus:border-[var(--color-primary)] focus:ring-3 focus:ring-[var(--color-primary-soft)]"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="task-status">Status</label>
            <Select id="task-status" name="status" defaultValue={task?.status ?? "todo"}>
              {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </div>
          <div>
            <label className="field-label" htmlFor="task-priority">Priority</label>
            <Select id="task-priority" name="priority" defaultValue={task?.priority ?? "medium"}>
              {priorityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="task-client">Client</label>
            <Select id="task-client" name="client_id" defaultValue={task?.client_id ?? ""}>
              <option value="">Internal / no client</option>
              {clients.map((client) => <option key={client.id} value={client.id}>{client.client_name}</option>)}
            </Select>
          </div>
          <div>
            <label className="field-label" htmlFor="task-due">Due date</label>
            <Input id="task-due" name="due_date" type="date" defaultValue={task?.due_date ?? ""} />
          </div>
        </div>
        <fieldset>
          <div className="mb-1 flex items-center justify-between">
            <legend className="field-label !mb-0">Assignees</legend>
            <span className="text-[11px] text-[var(--color-text-muted)]">
              {assignees.length ? `${assignees.length} selected` : "Optional"}
            </span>
          </div>
          <div className="grid max-h-52 gap-2 overflow-y-auto rounded-xl border border-[var(--color-border-subtle)] bg-slate-50/70 p-2 sm:grid-cols-2">
            {users.map((user) => {
              const selected = assignees.includes(user.id);
              return (
              <label
                key={user.id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border bg-white p-2.5 transition",
                  selected
                    ? "border-[var(--color-primary)] ring-2 ring-[var(--color-primary-soft)]"
                    : "border-[var(--color-border-subtle)] hover:border-emerald-200",
                )}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={(event) => setAssignees((current) =>
                    event.target.checked ? [...current, user.id] : current.filter((id) => id !== user.id)
                  )}
                  className="sr-only"
                />
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[10px] font-bold text-[var(--color-primary)]">
                  {user.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold">{user.name}</span>
                  <span className="block truncate text-[10px] capitalize text-[var(--color-text-muted)]">
                    {user.role} · {user.activeTasks} active
                  </span>
                </span>
                <span className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full border text-[10px]",
                  selected
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                    : "border-[var(--color-border-default)] text-transparent",
                )}>✓</span>
              </label>
              );
            })}
          </div>
        </fieldset>
        <div>
          <label className="field-label" htmlFor="task-tags">Tags</label>
          <Input id="task-tags" name="tags" defaultValue={task?.tags.join(", ") ?? ""} placeholder="design, campaign, urgent" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={pending}>{pending ? "Saving…" : task ? "Save changes" : "Create task"}</Button>
        </div>
      </form>
    </Modal>
  );
}

