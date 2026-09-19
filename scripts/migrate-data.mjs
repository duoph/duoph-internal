import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Missing MONGODB_URI");

const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB ?? "dcrm");
  const users = db.collection("users");
  const clients = db.collection("clients");
  const cashflow = db.collection("cashflow");
  const tasks = db.collection("tasks");
  const activity = db.collection("task_activity");
  const schemaVersions = db.collection("schema_versions");

  const userDefaults = await users.updateMany(
    { role: { $exists: false } },
    { $set: { role: "member", disabled_at: null } },
  );
  await users.updateOne(
    { email: "duophtechnologies@gmail.com" },
    { $set: { role: "admin" } },
  );
  const cashflowDefaults = await cashflow.updateMany(
    { payment_status: { $exists: false } },
    { $set: { payment_status: "received" } },
  );
  const clientDefaults = await clients.updateMany(
    { project_value: { $exists: false } },
    { $set: { project_value: 0 } },
  );

  await Promise.all([
    tasks.createIndex({ deleted_at: 1, status: 1, due_date: 1 }),
    tasks.createIndex({ assignee_ids: 1, deleted_at: 1 }),
    tasks.createIndex({ created_by: 1, created_at: -1 }),
    tasks.createIndex({ completed_at: -1, assignee_ids: 1 }),
    tasks.createIndex({ completed_late: 1, first_missed_at: 1 }),
    activity.createIndex({ task_id: 1, created_at: -1 }),
    activity.createIndex({ actor_id: 1, created_at: -1 }),
    db.collection("task_scores").createIndex({ user_id: 1 }, { unique: true }),
    db.collection("task_scores").createIndex({ rank: 1 }),
  ]);

  function deadlineFor(dueDate) {
    return new Date(`${dueDate}T23:59:59.999Z`);
  }

  const now = new Date();
  const existingTasks = await tasks.find({ deleted_at: null }).toArray();
  let deadlineBackfill = 0;
  for (const task of existingTasks) {
    if (task.status === "cancelled") continue;
    const due = task.due_date ?? null;
    const deadline = due ? deadlineFor(due) : null;
    const completedAt = task.status === "completed" ? task.completed_at ?? null : null;
    const missedNow = deadline
      ? completedAt
        ? completedAt > deadline
        : now > deadline
      : false;
    const firstMissedAt = task.first_missed_at ?? (missedNow ? deadline : null);
    const completedLate = Boolean(task.status === "completed" && firstMissedAt);
    const currentlyOverdue = Boolean(deadline && task.status !== "completed" && now > deadline);
    const hoursLate = deadline
      ? Math.max(0, ((completedAt ?? now).getTime() - deadline.getTime()) / 36e5)
      : 0;
    const daysLate = completedLate || currentlyOverdue ? Math.max(1, Math.ceil(hoursLate / 24)) : completedLate ? 0 : null;
    let outcome = "none";
    let scorePoints = null;
    if (task.status === "completed" && !due) {
      scorePoints = 80;
    } else if (task.status === "completed" && completedLate) {
      outcome = "late";
      scorePoints = Math.max(30, Math.round(70 - hoursLate / 24 * 4));
    } else if (task.status === "completed") {
      outcome = "on_time";
      scorePoints = 100;
    } else if (currentlyOverdue) {
      outcome = "open_overdue";
      scorePoints = 0;
    }

    const next = {
      first_missed_at: firstMissedAt,
      deadline_outcome: outcome,
      completed_late: completedLate,
      days_late: currentlyOverdue || completedLate ? daysLate : task.status === "completed" && due ? 0 : null,
      lateness_hours: currentlyOverdue || completedLate ? Math.round(hoursLate) : task.status === "completed" && due ? 0 : null,
      score_points: scorePoints,
    };
    const changed =
      String(task.first_missed_at ?? "") !== String(next.first_missed_at ?? "") ||
      task.deadline_outcome !== next.deadline_outcome ||
      Boolean(task.completed_late) !== next.completed_late ||
      task.score_points !== next.score_points;
    if (!changed) continue;
    await tasks.updateOne({ _id: task._id }, { $set: next });
    deadlineBackfill += 1;
  }

  await schemaVersions.updateOne(
    { key: "task-management" },
    {
      $set: {
        version: 3,
        description: "Persisted overdue-completion records and employee task scores",
        applied_at: new Date(),
      },
    },
    { upsert: true },
  );

  console.log(`Users backfilled: ${userDefaults.modifiedCount}`);
  console.log(`Cashflow records backfilled: ${cashflowDefaults.modifiedCount}`);
  console.log(`Client project values backfilled: ${clientDefaults.modifiedCount}`);
  console.log(`Task deadline records backfilled: ${deadlineBackfill}`);
  console.log("Task indexes ready");
} finally {
  await client.close();
}

