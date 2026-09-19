export type WorkType = string;

export type UserRole = "admin" | "manager" | "member";

export type TaskStatus = "todo" | "in_progress" | "in_review" | "completed" | "cancelled";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type DeadlineOutcome = "none" | "on_time" | "late" | "open_overdue";

export type TaskRow = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_ids: string[];
  client_id: string | null;
  created_by: string;
  due_date: string | null;
  completed_at: string | null;
  first_missed_at: string | null;
  deadline_outcome: DeadlineOutcome;
  completed_late: boolean;
  days_late: number | null;
  lateness_hours: number | null;
  score_points: number | null;
  tags: string[];
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskWithRelations = TaskRow & {
  assignees: { id: string; name: string; email: string }[];
  client: { id: string; client_name: string } | null;
  creator: { id: string; name: string } | null;
};

export type TaskActivityRow = {
  id: string;
  task_id: string;
  actor_id: string;
  actor: { id: string; name: string } | null;
  action: "created" | "updated" | "deleted";
  details: {
    changedFields?: string[];
    previousStatus?: TaskStatus;
    status?: TaskStatus;
    assigneeIds?: string[];
    previousAssigneeIds?: string[];
    dueDate?: string | null;
    previousDueDate?: string | null;
    priority?: TaskPriority;
    completedLate?: boolean;
    deadlineOutcome?: DeadlineOutcome;
    daysLate?: number | null;
    scorePoints?: number | null;
  };
  created_at: string;
};

export type WorkTypeRow = {
  key: string;
  label: string;
  created_at: string;
};

export type WorkStatus = "ongoing" | "completed" | "on_hold" | "pending";

export type WorkItemRow = {
  id: string;
  work: string;
  client_id: string;
  work_type: string;
  status: WorkStatus;
  committed_date: string | null;
  completed_date: string | null;
  remarks: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type UsersProfile = {
  id: string;
  admin_name: string;
  created_at: string;
};

export type ClientRow = {
  id: string;
  client_name: string;
  email: string;
  contact_number: string;
  country: string;
  work_type: WorkType;
  project_value: number;
  admin_name: string | null;
  created_at: string;
};

export type CashflowRow = {
  id: string;
  date: string;
  income: number;
  expense: number;
  payment_status: "received" | "pending";
  details: string | null;
  client_id: string | null;
  work_type: WorkType;
  created_at: string;
};

export type CashflowWithClient = CashflowRow & {
  clients: Pick<ClientRow, "id" | "client_name" | "email"> | null;
};

export type WorkItemWithClient = WorkItemRow & {
  clients: { id: string; client_name: string } | null;
};

export type PeriodPoint = { label: string; income: number; expense: number };
