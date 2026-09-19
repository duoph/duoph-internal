import "server-only";

import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { COL, getDb } from "@/lib/db/mongodb";
import { toId } from "@/lib/db/serialize";
import type { UserRole } from "@/lib/types/database";

export type UserDoc = {
  _id: ObjectId;
  email: string;
  password_hash: string;
  admin_name: string;
  role?: UserRole;
  disabled_at?: Date | null;
  created_at: Date;
  last_sign_in_at?: Date | null;
};

export async function findUserByEmail(email: string): Promise<UserDoc | null> {
  const db = await getDb();
  return db.collection<UserDoc>(COL.users).findOne({ email: email.toLowerCase() });
}

export async function findUserById(id: string): Promise<UserDoc | null> {
  const db = await getDb();
  if (!ObjectId.isValid(id)) return null;
  return db.collection<UserDoc>(COL.users).findOne({ _id: new ObjectId(id) });
}

export async function createUser(input: {
  email: string;
  password: string;
  admin_name: string;
  role?: UserRole;
}): Promise<{ id: string }> {
  const db = await getDb();
  const password_hash = await bcrypt.hash(input.password, 10);
  const now = new Date();
  const result = await db.collection(COL.users).insertOne({
    email: input.email.toLowerCase(),
    password_hash,
    admin_name: input.admin_name,
    role: input.role ?? "member",
    disabled_at: null,
    created_at: now,
    last_sign_in_at: null,
  });
  return { id: result.insertedId.toString() };
}

export async function verifyUserPassword(email: string, password: string): Promise<UserDoc | null> {
  const user = await findUserByEmail(email);
  if (!user || user.disabled_at) return null;
  const ok = await bcrypt.compare(password, user.password_hash);
  return ok ? user : null;
}

export async function updateUserPassword(userId: string, password: string) {
  const db = await getDb();
  const password_hash = await bcrypt.hash(password, 10);
  await db.collection(COL.users).updateOne({ _id: new ObjectId(userId) }, { $set: { password_hash } });
}

export async function updateUserProfile(userId: string, admin_name: string) {
  const db = await getDb();
  await db.collection(COL.users).updateOne({ _id: new ObjectId(userId) }, { $set: { admin_name } });
}

export async function updateUserRole(userId: string, role: UserRole) {
  const db = await getDb();
  await db.collection(COL.users).updateOne({ _id: new ObjectId(userId) }, { $set: { role } });
}

export async function setUserDisabled(userId: string, disabled: boolean) {
  const db = await getDb();
  await db
    .collection(COL.users)
    .updateOne({ _id: new ObjectId(userId) }, { $set: { disabled_at: disabled ? new Date() : null } });
}

export async function touchLastSignIn(userId: string) {
  const db = await getDb();
  await db.collection(COL.users).updateOne({ _id: new ObjectId(userId) }, { $set: { last_sign_in_at: new Date() } });
}

export async function listAllUsers(): Promise<UserDoc[]> {
  const db = await getDb();
  return db.collection<UserDoc>(COL.users).find().sort({ admin_name: 1 }).toArray();
}

export function userToSession(user: UserDoc) {
  return { id: toId(user._id), email: user.email };
}
