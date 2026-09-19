"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { clientService } from "@/lib/api/clients";
import { dbErrorMessage } from "@/lib/db/error-message";
import type { WorkType } from "@/lib/types/database";

export async function createClientAction(input: {
  client_name: string;
  email: string;
  contact_number: string;
  country: string;
  work_type: WorkType;
  project_value: number;
  admin_name: string;
}) {
  const user = await getSession();
  if (!user) return { error: "Unauthorized" };
  try {
    const row = await clientService.create({
      client_name: input.client_name,
      email: input.email,
      contact_number: input.contact_number,
      country: input.country,
      work_type: input.work_type,
      project_value: Math.max(0, Number(input.project_value) || 0),
      admin_name: input.admin_name,
    });
    revalidatePath("/clients", "page");
    revalidatePath("/dashboard");
    revalidatePath("/cashflow");
    return { ok: true as const, id: row.id };
  } catch (e) {
    console.error("[createClientAction]", e);
    return { error: dbErrorMessage(e) };
  }
}

export async function updateClientAction(
  id: string,
  input: Partial<{
    client_name: string;
    email: string;
    contact_number: string;
    country: string;
    work_type: WorkType;
    project_value: number;
    admin_name: string;
  }>,
) {
  const user = await getSession();
  if (!user) return { error: "Unauthorized" };
  try {
    await clientService.update(id, input);
    revalidatePath("/clients");
    revalidatePath("/dashboard");
    return { ok: true as const };
  } catch (e) {
    console.error("[updateClientAction]", e);
    return { error: dbErrorMessage(e) };
  }
}

export async function deleteClientAction(id: string) {
  const user = await getSession();
  if (!user) return { error: "Unauthorized" };
  try {
    await clientService.remove(id);
    revalidatePath("/clients");
    revalidatePath("/dashboard");
    revalidatePath("/cashflow");
    return { ok: true as const };
  } catch (e) {
    console.error("[deleteClientAction]", e);
    return { error: dbErrorMessage(e) };
  }
}
