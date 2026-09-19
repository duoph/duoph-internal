import "server-only";

import { ObjectId } from "mongodb";
import { COL, getDb } from "@/lib/db/mongodb";
import { toId, toIso } from "@/lib/db/serialize";
import type { ClientRow, WorkType } from "@/lib/types/database";

type ClientDoc = {
  _id: ObjectId;
  client_name: string;
  email: string;
  contact_number: string;
  country: string;
  work_type: string;
  admin_name: string | null;
  created_at: Date;
};

function toRow(doc: ClientDoc): ClientRow {
  return {
    id: toId(doc._id),
    client_name: doc.client_name,
    email: doc.email,
    contact_number: doc.contact_number,
    country: doc.country,
    work_type: doc.work_type as WorkType,
    admin_name: doc.admin_name,
    created_at: toIso(doc.created_at)!,
  };
}

export const clientService = {
  async list(filters?: { work_type?: WorkType; country?: string }): Promise<ClientRow[]> {
    const db = await getDb();
    const filter: Record<string, unknown> = {};
    if (filters?.work_type) filter.work_type = filters.work_type;
    if (filters?.country) filter.country = { $regex: filters.country, $options: "i" };
    const docs = await db
      .collection<ClientDoc>(COL.clients)
      .find(filter)
      .sort({ created_at: -1 })
      .toArray();
    return docs.map(toRow);
  },

  async create(row: Omit<ClientRow, "id" | "created_at">): Promise<ClientRow> {
    const db = await getDb();
    const now = new Date();
    const result = await db.collection(COL.clients).insertOne({ ...row, created_at: now });
    return toRow({ _id: result.insertedId, ...row, created_at: now } as ClientDoc);
  },

  async update(id: string, patch: Partial<Omit<ClientRow, "id" | "created_at">>): Promise<ClientRow> {
    const db = await getDb();
    const result = await db
      .collection<ClientDoc>(COL.clients)
      .findOneAndUpdate({ _id: new ObjectId(id) }, { $set: patch }, { returnDocument: "after" });
    if (!result) throw new Error("Client not found");
    return toRow(result);
  },

  async remove(id: string): Promise<void> {
    const db = await getDb();
    await db.collection(COL.clients).deleteOne({ _id: new ObjectId(id) });
  },

  async getManyByIds(ids: string[]): Promise<Map<string, ClientRow>> {
    const valid = ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
    if (!valid.length) return new Map();
    const db = await getDb();
    const docs = await db.collection<ClientDoc>(COL.clients).find({ _id: { $in: valid } }).toArray();
    return new Map(docs.map((d) => [toId(d._id), toRow(d)]));
  },
};
