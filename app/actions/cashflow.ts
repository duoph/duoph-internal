"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { cashflowService } from "@/lib/api/cashflow";
import type { WorkType } from "@/lib/types/database";

export async function createCashflowAction(input: {
  date: string;
  income: number;
  expense: number;
  payment_status: "received" | "pending";
  details: string;
  client_id: string | null;
  work_type: WorkType;
}) {
  const user = await getSession();
  if (!user) return { error: "Unauthorized" };
  try {
    await cashflowService.create({
      date: input.date,
      income: input.income,
      expense: input.expense,
      payment_status: input.expense > 0 ? "received" : input.payment_status,
      details: input.details || null,
      client_id: input.client_id,
      work_type: input.work_type,
    });
    revalidatePath("/cashflow");
    revalidatePath("/dashboard");
    revalidatePath("/reports");
    return { ok: true as const };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    return { error: msg };
  }
}

export async function updateCashflowAction(
  id: string,
  input: Partial<{
    date: string;
    income: number;
    expense: number;
    payment_status: "received" | "pending";
    details: string;
    client_id: string | null;
    work_type: WorkType;
  }>,
) {
  const user = await getSession();
  if (!user) return { error: "Unauthorized" };
  try {
    await cashflowService.update(id, {
      ...input,
      ...(input.expense !== undefined && input.expense > 0 ? { payment_status: "received" as const } : {}),
    });
    revalidatePath("/cashflow");
    revalidatePath("/dashboard");
    revalidatePath("/reports");
    return { ok: true as const };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    return { error: msg };
  }
}

export async function deleteCashflowAction(id: string) {
  const user = await getSession();
  if (!user) return { error: "Unauthorized" };
  try {
    await cashflowService.remove(id);
    revalidatePath("/cashflow");
    revalidatePath("/dashboard");
    revalidatePath("/reports");
    return { ok: true as const };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    return { error: msg };
  }
}
