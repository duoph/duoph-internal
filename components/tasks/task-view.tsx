"use client";

import { useState, useTransition, type ReactNode, type SyntheticEvent } from "react";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { RowActions } from "@/components/ui/row-actions";
import { formatDate, formatFriendlyDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type {
  TaskActivityRow,
  TaskPriority,
  TaskStatus,
  TaskWithRelations,
} from "@/lib/types/database";

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "in_review", label: "In review" },
  { value: "completed", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
];

const priorityOptions: { value: TaskPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const statusStyles: Record<TaskStatus, string> = {
  todo: "bg-slate-100 text-slate-600",
  in_progress: "bg-sky-100 text-sky-700",
  in_review: "bg-violet-100 text-violet-700",
  completed: "bg-emerald-100 text-[var(--color-primary)]",
  cancelled: "bg-slate-100 text-slate-400",
};

const priorityStyles: Record<TaskPriority, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-rose-100 text-rose-700",
  urgent: "bg-rose-200 text-rose-800",
};

const TABLE_COLS =
  "grid-cols-[7.25rem_minmax(16rem,1.6fr)_9.25rem_minmax(10rem,0.95fr)_7.5rem_minmax(8rem,1fr)_2.5rem]";

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
type TaskFilters = { status?: string; assignee?: string; due?: string; client?: string };

function stopRowOpen(event: SyntheticEvent) {
  event.stopPropagation();
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-[var(--color-border-subtle)] bg-white px-2.5 text-xs text-[var(--color-text-secondary)]">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="max-w-36 bg-transparent font-medium text-[var(--color-text-primary)] outline-none"
      >
        {children}
      </select>
    </label>
  );
}

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
  filters: TaskFilters;
  today: string;
}) {
  const router = useRouter();
  const [editor, setEditor] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<TaskWithRelations | null>(null);
  const [draftClientId, setDraftClientId] = useState("");
  const [draftDueDate, setDraftDueDate] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<TaskWithRelations | null>(null);
  const [detailTask, setDetailTask] = useState<TaskWithRelations | null>(null);
  const [activity, setActivity] = useState<TaskActivityRow[] | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [statusPatches, setStatusPatches] = useState<Record<string, TaskStatus>>({});

  function applyStatus(taskId: string, status: TaskStatus) {
    setStatusPatches((current) => ({ ...current, [taskId]: status }));
    setDetailTask((current) => (current?.id === taskId ? { ...current, status } : current));
  }

  const nextWeek = dateInDays(today, 7);
  const filteredTasks = tasks.map((task) => {
    const status = statusPatches[task.id];
    return status ? { ...task, status } : task;
  }).filter((task) => {
    if (filters.status && task.status !== filters.status) return false;
    if (filters.assignee === "me" && !task.assignee_ids.includes(currentUserId)) return false;
    if (filters.assignee === "created" && task.created_by !== currentUserId) return false;
    if (
      filters.assignee &&
      filters.assignee !== "me" &&
      filters.assignee !== "created" &&
      !task.assignee_ids.includes(filters.assignee)
    ) {
      return false;
    }
    if (filters.client === "none" && task.client_id) return false;
    if (filters.client && filters.client !== "none" && task.client_id !== filters.client) return false;
    if (filters.due === "overdue") return isOverdue(task, today);
    if (filters.due === "today") return task.due_date === today;
    if (filters.due === "week") {
      return Boolean(task.due_date && task.due_date >= today && task.due_date <= nextWeek);
    }
    if (filters.due === "later") return Boolean(task.due_date && task.due_date > nextWeek);
    if (filters.due === "none") return !task.due_date;
    return true;
  });

  const groups = (() => {
    const isOpen = (task: TaskWithRelations) =>
      task.status !== "completed" && task.status !== "cancelled";
    const historyDate = (task: TaskWithRelations) =>
      task.due_date ?? task.completed_at?.slice(0, 10) ?? task.created_at.slice(0, 10);

    const overdueRows = filteredTasks.filter((task) => isOverdue(task, today));
    const openUpcoming = filteredTasks.filter(
      (task) => isOpen(task) && !isOverdue(task, today) && Boolean(task.due_date && task.due_date >= today),
    );
    const openUndated = filteredTasks.filter((task) => isOpen(task) && !task.due_date);
    const previousRows = filteredTasks.filter(
      (task) => !isOverdue(task, today) && !openUpcoming.includes(task) && !openUndated.includes(task),
    );

    function groupsByDate(rows: TaskWithRelations[], direction: "asc" | "desc", prefix: string) {
      const map = new Map<string, TaskWithRelations[]>();
      for (const task of rows) {
        const date = task.due_date ?? historyDate(task);
        const list = map.get(date) ?? [];
        list.push(task);
        map.set(date, list);
      }
      return [...map.entries()]
        .sort(([a], [b]) => (direction === "asc" ? a.localeCompare(b) : b.localeCompare(a)))
        .map(([date, list]) => ({
          key: `${prefix}-${date}`,
          label: date === today ? "Today" : formatFriendlyDate(date),
          dueDate: date,
          rows: list,
        }));
    }

    const previous = groupsByDate(previousRows, "desc", "prev").map((group) => ({
      ...group,
      label: group.dueDate === today ? "Done today" : formatFriendlyDate(group.dueDate),
    }));

    return [
      overdueRows.length ? { key: "overdue", label: "Overdue", dueDate: "", rows: overdueRows } : null,
      ...groupsByDate(openUpcoming, "asc", "open"),
      openUndated.length ? { key: "none", label: "No date", dueDate: "", rows: openUndated } : null,
      ...previous,
    ].filter((group): group is { key: string; label: string; dueDate: string; rows: TaskWithRelations[] } => Boolean(group));
  })();

  const hasFilters = Boolean(filters.status || filters.assignee || filters.due || filters.client);

  function setFilter(key: keyof TaskFilters, value: string) {
    const next = { ...filters, [key]: value || undefined };
    const params = new URLSearchParams();
    for (const [name, param] of Object.entries(next)) {
      if (param) params.set(name, param);
    }
    router.push(`/tasks${params.size ? `?${params.toString()}` : ""}`);
  }

  function openCreate(clientId = "", dueDate = "") {
    setSelected(null);
    setDraftClientId(clientId);
    setDraftDueDate(dueDate);
    setEditor("create");
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
    <div className="flex h-full min-h-0 flex-col">
      <PageHeaderActions>
        <Button type="button" className="h-9 px-3.5 py-0 text-xs" onClick={() => openCreate()}>
          <span aria-hidden>＋</span> New task
        </Button>
      </PageHeaderActions>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white">
        <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-[var(--color-border-subtle)] px-3 py-2">
          <FilterSelect label="Assigned For" value={filters.assignee ?? ""} onChange={(value) => setFilter("assignee", value)}>
            <option value="">Anyone</option>
            <option value="me">Me</option>
            <option value="created">Assigned by me</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </FilterSelect>
          <FilterSelect label="Status" value={filters.status ?? ""} onChange={(value) => setFilter("status", value)}>
            <option value="">Any</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </FilterSelect>
          <FilterSelect label="Due" value={filters.due ?? ""} onChange={(value) => setFilter("due", value)}>
            <option value="">Any date</option>
            <option value="overdue">Overdue</option>
            <option value="today">Today</option>
            <option value="week">This week</option>
            <option value="later">Later</option>
            <option value="none">No date</option>
          </FilterSelect>
          <FilterSelect label="Project" value={filters.client ?? ""} onChange={(value) => setFilter("client", value)}>
            <option value="">All</option>
            <option value="none">No project</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>{client.client_name}</option>
            ))}
          </FilterSelect>
          {hasFilters ? (
            <button
              type="button"
              className="ml-auto shrink-0 px-2 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              onClick={() => router.push("/tasks")}
            >
              Reset
            </button>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <div className="min-w-[920px]">
            <div className={cn("sticky top-0 z-20 grid items-center gap-3 border-b border-[var(--color-border-subtle)] bg-white px-4 py-2.5 text-[11px] text-[var(--color-text-muted)]", TABLE_COLS)}>
              <span>Date</span>
              <span>Task name</span>
              <span>Status</span>
              <span>Assigned For</span>
              <span>Priority</span>
              <span>Summary</span>
              <span />
            </div>

            {groups.length ? groups.map((group) => {
              const isCollapsed = collapsed[group.key];
              const completed = group.rows.filter((task) => task.status === "completed").length;
              return (
                <section key={group.key}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-slate-50/80"
                    onClick={() => setCollapsed((current) => ({ ...current, [group.key]: !current[group.key] }))}
                  >
                    <span className="text-[11px] text-[var(--color-text-muted)]">{isCollapsed ? "▶" : "▼"}</span>
                    <span className={cn("text-sm font-semibold", group.key === "overdue" ? "text-rose-700" : "text-[var(--color-text-primary)]")}>{group.label}</span>
                    <span className="text-xs text-[var(--color-text-muted)]">{group.rows.length}</span>
                  </button>
                  {isCollapsed ? null : (
                    <>
                      {group.rows.map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          canEdit={task.created_by === currentUserId}
                          canUpdateStatus={task.assignee_ids.includes(currentUserId)}
                          canDelete={canManage || task.created_by === currentUserId}
                          today={today}
                          onStatus={(status) => applyStatus(task.id, status)}
                          onEdit={() => {
                            setSelected(task);
                            setEditor("edit");
                          }}
                          onOpen={() => void openTaskDetail(task)}
                          onDelete={() => setDeleteTarget(task)}
                        />
                      ))}
                      <p className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                        Complete {completed}/{group.rows.length}
                      </p>
                    </>
                  )}
                </section>
              );
            }) : (
              <div className="flex min-h-56 flex-col items-center justify-center text-center">
                <h2 className="text-sm font-semibold">No tasks in this view</h2>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">Create a task or reset the filters.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <TaskEditor
        key={`${selected?.id ?? editor ?? "closed"}-${draftClientId}-${draftDueDate}`}
        open={editor !== null}
        task={editor === "edit" ? selected : null}
        users={users}
        clients={clients}
        currentUserId={currentUserId}
        defaultClientId={draftClientId}
        defaultDueDate={draftDueDate}
        onClose={() => {
          setEditor(null);
          setSelected(null);
          setDraftClientId("");
          setDraftDueDate("");
        }}
      />

      <TaskDetailModal
        open={Boolean(detailTask)}
        task={detailTask}
        activity={activity}
        canEdit={detailTask?.created_by === currentUserId}
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
  canEdit,
  canUpdateStatus,
  canDelete,
  today,
  onStatus,
  onEdit,
  onOpen,
  onDelete,
}: {
  task: TaskWithRelations;
  canEdit: boolean;
  canUpdateStatus: boolean;
  canDelete: boolean;
  today: string;
  onStatus: (status: TaskStatus) => void;
  onEdit: () => void;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const [saving, startTransition] = useTransition();
  const overdue = isOverdue(task, today);
  const assignee = task.assignees[0];
  const statusLabel = statusOptions.find((option) => option.value === task.status)?.label ?? task.status;
  const priorityLabel = priorityOptions.find((option) => option.value === task.priority)?.label ?? task.priority;

  function markStatus(status: TaskStatus) {
    const previous = task.status;
    onStatus(status);
    const label = statusOptions.find((option) => option.value === status)?.label ?? status;
    toast.success(`Status updated to ${label}`);
    startTransition(async () => {
      const result = await updateTaskAction(task.id, { status });
      if (result.error) {
        onStatus(previous);
        toast.error(result.error);
      }
    });
  }

  return (
    <div
      className={cn(
        "group grid cursor-pointer items-center gap-3 border-t border-[var(--color-border-subtle)] px-4 py-2.5 hover:bg-slate-50/80",
        TABLE_COLS,
        saving && "opacity-80",
      )}
      onClick={onOpen}
    >
      <span className={cn(
        "truncate text-sm",
        overdue ? "font-medium text-rose-600" : "text-[var(--color-text-secondary)]",
        task.status === "completed" && "text-[var(--color-text-muted)] line-through",
      )}>
        {task.due_date ? formatFriendlyDate(task.due_date) : ""}
      </span>

      <div className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 text-[var(--color-text-muted)]" aria-hidden>📄</span>
        <p className={cn("truncate text-sm font-medium", task.status === "completed" && "text-[var(--color-text-muted)] line-through")}>
          {task.title}
        </p>
        {overdue ? (
          <span className="rounded border border-slate-200 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Open
          </span>
        ) : null}
      </div>

      {canUpdateStatus ? (
        <select
          value={task.status}
          aria-label={`Status for ${task.title}`}
          className={cn(
            "h-7 w-full appearance-none rounded-full border-0 px-2.5 text-left text-[11px] font-semibold outline-none",
            statusStyles[task.status],
          )}
          onPointerDown={stopRowOpen}
          onMouseDown={stopRowOpen}
          onClick={stopRowOpen}
          onChange={(event) => markStatus(event.target.value as TaskStatus)}
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      ) : (
        <span className={cn(
          "inline-flex h-7 w-full items-center rounded-full px-2.5 text-[11px] font-semibold",
          statusStyles[task.status],
        )}>
          {statusLabel}
        </span>
      )}

      <div className="flex min-w-0 items-center gap-2">
        {assignee ? (
          <>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[9px] font-bold text-[var(--color-primary)]">
              {assignee.name.slice(0, 2).toUpperCase()}
            </span>
            <span className="truncate text-sm text-[var(--color-text-secondary)]">
              {assignee.name}
              {task.assignees.length > 1 ? ` +${task.assignees.length - 1}` : ""}
            </span>
          </>
        ) : (
          <span className="text-sm text-[var(--color-text-muted)]"> </span>
        )}
      </div>

      <span className={cn(
        "inline-flex h-7 w-full items-center rounded-md px-2 text-[11px] font-semibold",
        priorityStyles[task.priority],
      )}>
        {priorityLabel}
      </span>

      <p className={cn("truncate text-sm text-[var(--color-text-muted)]", task.status === "completed" && "line-through")}>{task.description || ""}</p>

      <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
        {canEdit || canDelete ? (
          <RowActions
            onEdit={canEdit ? onEdit : undefined}
            onDelete={canDelete ? onDelete : undefined}
          />
        ) : null}
      </div>
    </div>
  );
}

function TaskDetailModal({
  open,
  task,
  activity,
  canEdit,
  onClose,
  onEdit,
}: {
  open: boolean;
  task: TaskWithRelations | null;
  activity: TaskActivityRow[] | null;
  canEdit: boolean;
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
            <Badge className={cn("border-transparent", priorityStyles[task.priority])}>{task.priority} priority</Badge>
            <Badge className={cn("border-transparent", statusStyles[task.status])}>{statusLabel}</Badge>
            {task.completed_late ? (
              <Badge className="border-amber-200 bg-amber-50 text-amber-800">
                Completed late{task.days_late ? ` · ${task.days_late} day${task.days_late === 1 ? "" : "s"}` : ""}
              </Badge>
            ) : task.first_missed_at ? (
              <Badge className="border-rose-200 bg-rose-50 text-rose-700">Missed deadline</Badge>
            ) : null}
          </div>
          <h2 className={cn("text-xl font-semibold tracking-tight", task.status === "completed" && "text-[var(--color-text-muted)] line-through")}>{task.title}</h2>
          {task.description ? (
            <p className={cn("mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--color-text-secondary)]", task.status === "completed" && "line-through")}>{task.description}</p>
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
              {task.assignees.length ? task.assignees.map((person) => (
                <div key={person.id} className="flex items-center gap-3 rounded-lg bg-slate-50 p-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[10px] font-bold text-[var(--color-primary)]">
                    {person.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold">{person.name}</span>
                    <span className="block truncate text-[10px] text-[var(--color-text-muted)]">{person.email}</span>
                  </span>
                </div>
              )) : <p className="text-xs text-[var(--color-text-muted)]">Unassigned</p>}
            </div>
          </div>
          <div>
            <p className="field-label">Context</p>
            <dl className="space-y-2 rounded-lg bg-slate-50 p-3 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--color-text-muted)]">Project</dt>
                <dd className="text-right font-medium">{task.client?.client_name ?? "No project"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--color-text-muted)]">Last updated</dt>
                <dd className="text-right font-medium">{dateTime(task.updated_at)}</dd>
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
          {canEdit ? <Button type="button" onClick={onEdit}>Edit task</Button> : null}
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
  currentUserId,
  defaultClientId = "",
  defaultDueDate = "",
  onClose,
}: {
  open: boolean;
  task: TaskWithRelations | null;
  users: UserOption[];
  clients: ClientOption[];
  currentUserId: string;
  defaultClientId?: string;
  defaultDueDate?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [assignees, setAssignees] = useState<string[]>(task?.assignee_ids ?? []);
  const canSetStatus = !task || task.assignee_ids.includes(currentUserId);

  return (
    <Modal open={open} title={task ? "Edit task" : "Create task"} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          const fields = {
            title: String(formData.get("title") ?? ""),
            description: String(formData.get("description") ?? ""),
            priority: String(formData.get("priority") ?? "medium") as TaskPriority,
            assignee_ids: assignees,
            client_id: String(formData.get("client_id") ?? ""),
            due_date: String(formData.get("due_date") ?? ""),
            tags: String(formData.get("tags") ?? "").split(",").map((tag) => tag.trim()).filter(Boolean),
          };
          const status = String(formData.get("status") ?? "todo") as TaskStatus;
          startTransition(async () => {
            const result = task
              ? await updateTaskAction(task.id, canSetStatus ? { ...fields, status } : fields)
              : await createTaskAction({ ...fields, status });
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
            <Select id="task-status" name="status" defaultValue={task?.status ?? "todo"} disabled={!canSetStatus}>
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
            <label className="field-label" htmlFor="task-client">Project</label>
            <Select id="task-client" name="client_id" defaultValue={task?.client_id ?? defaultClientId}>
              <option value="">No project</option>
              {clients.map((client) => <option key={client.id} value={client.id}>{client.client_name}</option>)}
            </Select>
          </div>
          <div>
            <label className="field-label" htmlFor="task-due">Due date</label>
            <Input id="task-due" name="due_date" type="date" defaultValue={task?.due_date ?? defaultDueDate} />
          </div>
        </div>
        <fieldset>
          <div className="mb-1 flex items-center justify-between">
            <legend className="field-label !mb-0">Assigned For</legend>
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
