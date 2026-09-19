# Duoph Operations database

The application uses MongoDB through the native Node.js driver. Collection names and runtime indexes are defined in `lib/db/mongodb.ts`. The idempotent data migration is `scripts/migrate-data.mjs`.

## Core collections

### `users`

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | User identifier |
| `email` | string | Unique, normalized email |
| `password_hash` | string | Bcrypt hash |
| `admin_name` | string | Display name |
| `role` | `admin`, `manager`, `member` | Authorization role |
| `disabled_at` | Date or null | Blocks login when set |
| `created_at` | Date | Account creation |
| `last_sign_in_at` | Date or null | Used for account activity |

### `tasks`

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | Task identifier |
| `title` | string | Required |
| `description` | string | Long-form task context |
| `status` | `todo`, `in_progress`, `in_review`, `completed`, `cancelled` | Workflow state |
| `priority` | `low`, `medium`, `high`, `urgent` | Delivery priority |
| `assignee_ids` | string[] | User ObjectIds serialized as strings |
| `created_by` | string | Assigning user |
| `client_id` | string or null | Optional client relationship |
| `due_date` | `YYYY-MM-DD` or null | End-of-day UTC deadline |
| `completed_at` | Date or null | First completion timestamp, kept even if the task is later reopened |
| `first_missed_at` | Date or null | Permanent historical missed-deadline marker. Never cleared. |
| `deadline_outcome` | `none`, `on_time`, `late`, `open_overdue` | Stored deadline result used for scoring |
| `completed_late` | boolean | `true` when the task was finished after its deadline |
| `days_late` | number or null | Whole days past the deadline at completion, or while still overdue |
| `lateness_hours` | number or null | Hours past the deadline |
| `score_points` | number or null | Stored task score contribution (0–100) |
| `tags` | string[] | Searchable labels |
| `deleted_at` | Date or null | Soft deletion |
| `created_at`, `updated_at` | Date | Audit timestamps |

`first_missed_at` is never cleared when a late task is eventually completed. Completing after the deadline stores `completed_late: true`, `deadline_outcome: "late"`, and reduced `score_points`. The miss remains in history and still affects reliability.

### `task_scores`

Employee KPI totals are persisted and recalculated whenever tasks change.

| Field | Type | Notes |
| --- | --- | --- |
| `user_id` | string | Assigned user |
| `score` | number | Stored performance score out of 100 |
| `rank` | number | Current leaderboard rank |
| `completed`, `completed_late`, `on_time`, `missed`, `overdue` | number | Count metrics |
| `completion_rate`, `on_time_rate`, `reliability`, `average_task_points` | number | Rate metrics |
| `computed_at` | Date | Last recalculation |

## Employee KPI rules

KPIs are computed from assigned tasks, not from task creators, then written to `tasks` and `task_scores`.

- **On-time completion**: 100 task points.
- **Late completion**: 30–70 task points depending on how late it was. The missed deadline stays on the task.
- **Still overdue**: 0 task points, counted as missed.
- **Completed with no due date**: 80 task points.
- **Performance score**: 50% average task points + 30% completion rate + 20% deadline reliability, plus a small volume boost.
- **Missed deadline**: a task that remained incomplete after its deadline. It remains missed even if completed later.
- **Overdue**: currently incomplete and past its deadline.
- **Completed late**: finished after the deadline; kept as a historical record and included in the score.

Additional KPIs include tasks completed in the last 7 and 30 days, current workflow counts, average completion time, average lateness, completed-late tasks, and current rank.

### `task_activity`

Each task mutation creates an immutable event.

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | ObjectId | Event identifier |
| `task_id` | string | Related task |
| `actor_id` | string | User who performed the action |
| `action` | `created`, `updated`, `deleted` | Event category |
| `details.changedFields` | string[] | Fields modified during an update |
| `details.previousStatus`, `details.status` | string | Status transition |
| `details.previousAssigneeIds`, `details.assigneeIds` | string[] | Assignment transition |
| `details.previousDueDate`, `details.dueDate` | string or null | Deadline transition |
| `created_at` | Date | Event time |

### `cashflow`

`payment_status` is either `received` or `pending`. Pending income is excluded from actual income, balance, and financial reports until marked received.

### `clients`

Client records include `project_value`, the quoted project price. Members may capture it during client creation, but only managers and admins receive it in the client UI. Existing clients are backfilled with `0`.

### Other collections

- `clients`: client contact and work-type data.
- `work_items`: legacy work records, kept separate from tasks.
- `work_types`: configurable work categories.
- `password_reset_tokens`: password recovery tokens.
- `task_scores`: persisted employee KPI totals and ranks.
- `schema_versions`: applied data-model versions.

## Role permissions

- **Admin**: users, password resets, roles, clients, tasks, cashflow, reports, and all analytics.
- **Manager**: clients, tasks, cashflow, reports, and all analytics.
- **Member**: clients, project-price capture, task creation/assignment, assigned-task status updates, team leaderboard, and task analytics. Financial totals, cashflow, and financial reports are not returned to members.

The score is designed as a positive coaching indicator. Managers should consider task complexity and workload before using it for employee evaluation.

## Indexes

Important task indexes:

- `{ deleted_at: 1, status: 1, due_date: 1 }`
- `{ assignee_ids: 1, deleted_at: 1 }`
- `{ created_by: 1, created_at: -1 }`
- `{ completed_at: -1, assignee_ids: 1 }`
- `{ completed_late: 1, first_missed_at: 1 }`
- Activity: `{ task_id: 1, created_at: -1 }`
- Activity: `{ actor_id: 1, created_at: -1 }`
- Scores: `{ user_id: 1 }` unique
- Scores: `{ rank: 1 }`

## Migration

Run:

```bash
npm run migrate-data
```

The migration is safe to rerun. It backfills user roles, cashflow payment statuses, client project values, task deadline records, and task indexes.

