import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Missing MONGODB_URI");

const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB ?? "dcrm");
  const users = db.collection("users");
  const cashflow = db.collection("cashflow");
  const tasks = db.collection("tasks");
  const activity = db.collection("task_activity");

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

  await Promise.all([
    tasks.createIndex({ deleted_at: 1, status: 1, due_date: 1 }),
    tasks.createIndex({ assignee_ids: 1, deleted_at: 1 }),
    tasks.createIndex({ created_by: 1, created_at: -1 }),
    activity.createIndex({ task_id: 1, created_at: -1 }),
  ]);

  console.log(`Users backfilled: ${userDefaults.modifiedCount}`);
  console.log(`Cashflow records backfilled: ${cashflowDefaults.modifiedCount}`);
  console.log("Task indexes ready");
} finally {
  await client.close();
}

