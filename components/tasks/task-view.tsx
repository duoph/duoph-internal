"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createTaskAction, deleteTaskAction, updateTaskAction } from "@/app/actions/tasks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { TaskPriority, TaskStatus, TaskWithRelations } from "@/lib/types/database";

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
  const [viewMode, setViewMode] = useState<"board" | "list">("board");

  const active = tasks.filter((task) => task.status !== "completed" && task.status !== "cancelled").length;
  const overdue = tasks.filter((task) => isOverdue(task, today)).length;
  const dueSoon = tasks.filter((task) => {
    if (!task.due_date || task.status === "completed" || task.status === "cancelled") return false;
    const diff =
      new Date(`${task.due_date}T23:59:59Z`).getTime() -
      new Date(`${today}T00:00:00Z`).getTime();
    return diff >= 0 && diff <= 3 * 24 * 60 * 60 * 1000;
  }).length;

  function applyFilters(formData: FormData) {
    const params = new URLSearchParams();
    for (const key of ["q", "status", "priority", "assignee"]) {
      const value = String(formData.get(key) ?? "").trim();
      if (value) params.set(key, value);
    }
    router.push(`/tasks${params.size ? `?${params.toString()}` : ""}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Team workspace</p>
          <h1 className="page-title">Tasks</h1>
          <p className="page-subtitle">Plan, assign, and follow every deadline in one place.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-[var(--radius-control)] border border-[var(--color-border-default)] bg-white p-1">
            {(["board", "list"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition",
                  viewMode === mode
                    ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                    : "text-[var(--color-text-muted)]",
                )}
              >
                {mode}
              </button>
            ))}
          </div>
          {canManage ? (
            <Button type="button" onClick={() => setEditor("create")}>
              <span aria-hidden>＋</span> New task
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Active tasks", value: active, tone: "text-[var(--color-text-primary)]" },
          { label: "Due in 3 days", value: dueSoon, tone: "text-amber-600" },
          { label: "Overdue now", value: overdue, tone: "text-rose-600" },
        ].map((item) => (
          <Card key={item.label} className="p-4 shadow-none">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
              {item.label}
            </p>
            <p className={cn("mt-2 text-3xl font-semibold", item.tone)}>{item.value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-4 shadow-none">
        <details className="group" open={Boolean(filters.q || filters.status || filters.priority || filters.assignee)}>
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
            <span>Search and filters</span>
            <span className="text-xs font-normal text-[var(--color-text-muted)] group-open:hidden">Show</span>
            <span className="hidden text-xs font-normal text-[var(--color-text-muted)] group-open:inline">Hide</span>
          </summary>
        <form action={applyFilters} className="mt-4 grid gap-3 border-t border-[var(--color-border-subtle)] pt-4 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_180px_160px_180px_auto]">
          <Input name="q" defaultValue={filters.q} placeholder="Search tasks or tags…" aria-label="Search tasks" />
          <Select name="status" defaultValue={filters.status ?? ""} aria-label="Filter by status">
            <option value="">All statuses</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
          <Select name="priority" defaultValue={filters.priority ?? ""} aria-label="Filter by priority">
            <option value="">All priorities</option>
            {priorityOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
          {canManage ? (
            <Select name="assignee" defaultValue={filters.assignee ?? ""} aria-label="Filter by assignee">
              <option value="">All assignees</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </Select>
          ) : <input type="hidden" name="assignee" value="" />}
          <Button type="submit" variant="secondary">Filter</Button>
        </form>
        </details>
      </Card>

      {tasks.length ? (
        viewMode === "board" ? (
          <div className="grid items-start gap-3 xl:grid-cols-4">
            {statusOptions
              .filter((option) => option.value !== "cancelled" || filters.status === "cancelled")
              .filter((option) => !filters.status || option.value === filters.status)
              .map((option) => {
                const columnTasks = tasks.filter((task) => task.status === option.value);
                return (
                  <section key={option.value} className="min-h-48 rounded-[var(--radius-card)] bg-slate-100/70 p-2">
                    <div className="flex items-center justify-between px-2 py-2">
                      <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">
                        {option.label}
                      </h2>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-[var(--color-text-muted)]">
                        {columnTasks.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {columnTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          canManage={canManage}
                          canUpdateStatus={canManage || task.assignee_ids.includes(currentUserId)}
                          today={today}
                          compact
                          onEdit={() => {
                            setSelected(task);
                            setEditor("edit");
                          }}
                          onDelete={() => setDeleteTarget(task)}
                        />
                      ))}
                      {!columnTasks.length ? (
                        <p className="px-2 py-8 text-center text-xs text-[var(--color-text-muted)]">No tasks</p>
                      ) : null}
                    </div>
                  </section>
                );
              })}
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                canManage={canManage}
                canUpdateStatus={canManage || task.assignee_ids.includes(currentUserId)}
                today={today}
                onEdit={() => {
                  setSelected(task);
                  setEditor("edit");
                }}
                onDelete={() => setDeleteTarget(task)}
              />
            ))}
          </div>
        )
      ) : (
        <Card className="flex min-h-64 flex-col items-center justify-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-primary-soft)] text-xl text-[var(--color-primary)]">
            ✓
          </div>
          <h2 className="text-lg font-semibold">No tasks found</h2>
          <p className="mt-1 max-w-sm text-sm text-[var(--color-text-secondary)]">
            {canManage ? "Create a task or adjust the filters to get started." : "Nothing is assigned to you right now."}
          </p>
        </Card>
      )}

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

function TaskCard({
  task,
  canManage,
  canUpdateStatus,
  today,
  compact = false,
  onEdit,
  onDelete,
}: {
  task: TaskWithRelations;
  canManage: boolean;
  canUpdateStatus: boolean;
  today: string;
  compact?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const overdue = isOverdue(task, today);

  return (
    <Card className={cn("group shadow-none transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]", compact ? "p-3.5" : "p-5", overdue && "border-rose-200")}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge className={priorityStyles[task.priority]}>{task.priority}</Badge>
            {task.first_missed_at ? <Badge className="border-rose-200 bg-rose-50 text-rose-700">Missed deadline</Badge> : null}
          </div>
          <h2 className="truncate text-base font-semibold text-[var(--color-text-primary)]">{task.title}</h2>
          {task.description && !compact ? (
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--color-text-secondary)]">{task.description}</p>
          ) : null}
        </div>
        {canManage ? (
          <div className="flex shrink-0 gap-1">
            <Button type="button" variant="ghost" className="h-8 px-2 text-xs" onClick={onEdit}>Edit</Button>
            <Button type="button" variant="ghost" className="h-8 px-2 text-xs text-rose-600" onClick={onDelete}>Delete</Button>
          </div>
        ) : null}
      </div>

      <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--color-border-subtle)] text-xs text-[var(--color-text-secondary)]", compact ? "mt-3 pt-3" : "mt-5 pt-4")}>
        <span className={cn(overdue && "font-semibold text-rose-600")}>
          {task.due_date ? `${overdue ? "Overdue · " : "Due "}${formatDate(task.due_date)}` : "No due date"}
        </span>
        {task.client ? <span>{task.client.client_name}</span> : null}
        <div className="flex items-center">
          {task.assignees.length ? (
            <>
              <div className="flex -space-x-1.5">
                {task.assignees.slice(0, 3).map((user) => (
                  <span
                    key={user.id}
                    title={user.name}
                    className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[var(--color-primary-soft)] text-[9px] font-bold text-[var(--color-primary)]"
                  >
                    {user.name.slice(0, 2).toUpperCase()}
                  </span>
                ))}
              </div>
              {task.assignees.length > 3 ? <span className="ml-1">+{task.assignees.length - 3}</span> : null}
            </>
          ) : <span>Unassigned</span>}
        </div>
      </div>

      <div className={cn("flex flex-wrap items-center justify-between gap-3", compact ? "mt-3" : "mt-4")}>
        <div className="flex flex-wrap gap-1.5">
          {task.tags.map((tag) => <span key={tag} className="rounded-md bg-slate-100 px-2 py-1 text-[11px] text-slate-600">#{tag}</span>)}
        </div>
        <Select
          value={task.status}
          disabled={!canUpdateStatus || pending}
          className="w-auto min-w-36 py-2 text-xs"
          aria-label={`Status for ${task.title}`}
          onChange={(event) => {
            const status = event.target.value as TaskStatus;
            startTransition(async () => {
              const result = await updateTaskAction(task.id, { status });
              if (result.error) {
                toast.error(result.error);
                return;
              }
              toast.success("Status updated");
              router.refresh();
            });
          }}
        >
          {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </Select>
      </div>
    </Card>
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

