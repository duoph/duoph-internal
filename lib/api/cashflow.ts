import "server-only";

import { ObjectId } from "mongodb";
import { COL, getDb } from "@/lib/db/mongodb";
import { toDateOnly, toId, toIso } from "@/lib/db/serialize";
import { clientService } from "@/lib/api/clients";
import type { CashflowRow, CashflowWithClient, WorkType } from "@/lib/types/database";

export type CashflowFilters = {
  from?: string;
  to?: string;
  client_id?: string;
  work_type?: WorkType;
};

type CashflowDoc = {
  _id: ObjectId;
  date: string;
  income: number;
  expense: number;
  payment_status?: "received" | "pending";
  details: string | null;
  client_id: string | null;
  work_type: string;
  created_at: Date;
};

function toRow(doc: CashflowDoc): CashflowRow {
  return {
    id: toId(doc._id),
    date: toDateOnly(doc.date)!,
    income: Number(doc.income),
    expense: Number(doc.expense),
    payment_status: doc.payment_status ?? "received",
    details: doc.details,
    client_id: doc.client_id,
    work_type: doc.work_type as WorkType,
    created_at: toIso(doc.created_at)!,
  };
}

export const cashflowService = {
  async list(filters?: CashflowFilters): Promise<CashflowWithClient[]> {
    const db = await getDb();
    const filter: Record<string, unknown> = {};
    if (filters?.from) filter.date = { ...(filter.date as object), $gte: filters.from };
    if (filters?.to) filter.date = { ...(filter.date as object), $lte: filters.to };
    if (filters?.client_id) filter.client_id = filters.client_id;
    if (filters?.work_type) filter.work_type = filters.work_type;

    const docs = await db
      .collection<CashflowDoc>(COL.cashflow)
      .find(filter)
      .sort({ date: -1, created_at: -1 })
      .toArray();

    const clientIds = [...new Set(docs.map((d) => d.client_id).filter(Boolean))] as string[];
    const clients = await clientService.getManyByIds(clientIds);

    return docs.map((doc) => {
      const row = toRow(doc);
      const c = doc.client_id ? clients.get(doc.client_id) : null;
      return {
        ...row,
        clients: c ? { id: c.id, client_name: c.client_name, email: c.email } : null,
      };
    });
  },

  async create(row: Omit<CashflowRow, "id" | "created_at">): Promise<CashflowRow> {
    const db = await getDb();
    const now = new Date();
    const result = await db.collection(COL.cashflow).insertOne({ ...row, created_at: now });
    return toRow({ _id: result.insertedId, ...row, created_at: now } as CashflowDoc);
  },

  async update(id: string, patch: Partial<Omit<CashflowRow, "id" | "created_at">>): Promise<CashflowRow> {
    const db = await getDb();
    const result = await db
      .collection<CashflowDoc>(COL.cashflow)
      .findOneAndUpdate({ _id: new ObjectId(id) }, { $set: patch }, { returnDocument: "after" });
    if (!result) throw new Error("Transaction not found");
    return toRow(result);
  },

  async remove(id: string): Promise<void> {
    const db = await getDb();
    await db.collection(COL.cashflow).deleteOne({ _id: new ObjectId(id) });
  },
};
