import "server-only";

import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;

declare global {
  var _mongoClient: MongoClient | undefined;
}

let client: MongoClient | null = null;
let db: Db | null = null;
let indexesEnsured = false;

export const COL = {
  users: "users",
  clients: "clients",
  cashflow: "cashflow",
  work_types: "work_types",
  work_items: "work_items",
  tasks: "tasks",
  task_activity: "task_activity",
  task_scores: "task_scores",
  password_reset_tokens: "password_reset_tokens",
} as const;

async function ensureIndexes(database: Db) {
  if (indexesEnsured) return;
  await Promise.all([
    database.collection(COL.users).createIndex({ email: 1 }, { unique: true }),
    database.collection(COL.password_reset_tokens).createIndex({ user_id: 1 }),
    database.collection(COL.password_reset_tokens).createIndex({ token_hash: 1 }),
    database.collection(COL.work_types).createIndex({ key: 1 }, { unique: true }),
    database.collection(COL.work_items).createIndex({ deleted_at: 1 }),
    database.collection(COL.work_items).createIndex({ client_id: 1 }),
    database.collection(COL.tasks).createIndex({ deleted_at: 1, status: 1, due_date: 1 }),
    database.collection(COL.tasks).createIndex({ assignee_ids: 1, deleted_at: 1 }),
    database.collection(COL.tasks).createIndex({ created_by: 1, created_at: -1 }),
    database.collection(COL.tasks).createIndex({ completed_at: -1, assignee_ids: 1 }),
    database.collection(COL.tasks).createIndex({ completed_late: 1, first_missed_at: 1 }),
    database.collection(COL.task_activity).createIndex({ task_id: 1, created_at: -1 }),
    database.collection(COL.task_activity).createIndex({ actor_id: 1, created_at: -1 }),
    database.collection(COL.task_scores).createIndex({ user_id: 1 }, { unique: true }),
    database.collection(COL.task_scores).createIndex({ rank: 1 }),
    database.collection(COL.clients).createIndex({ created_at: -1 }),
    database.collection(COL.cashflow).createIndex({ date: -1 }),
  ]);
  const wt = database.collection(COL.work_types);
  await wt.updateOne(
    { key: "website" },
    { $setOnInsert: { key: "website", label: "Website", created_at: new Date() } },
    { upsert: true },
  );
  await wt.updateOne(
    { key: "social_media" },
    { $setOnInsert: { key: "social_media", label: "Social Media", created_at: new Date() } },
    { upsert: true },
  );
  await wt.updateOne(
    { key: "branding" },
    { $setOnInsert: { key: "branding", label: "Branding", created_at: new Date() } },
    { upsert: true },
  );
  await wt.updateOne(
    { key: "other" },
    { $setOnInsert: { key: "other", label: "Other", created_at: new Date() } },
    { upsert: true },
  );
  indexesEnsured = true;
}

export async function getDb(): Promise<Db> {
  if (!uri) throw new Error("Missing MONGODB_URI");
  if (db) return db;
  client = global._mongoClient ?? new MongoClient(uri);
  if (process.env.NODE_ENV !== "production") global._mongoClient = client;
  await client.connect();
  db = client.db(process.env.MONGODB_DB ?? "dcrm");
  await ensureIndexes(db);
  return db;
}
