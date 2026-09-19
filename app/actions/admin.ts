"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/authorization";
import { createUser, findUserByEmail, setUserDisabled, updateUserRole } from "@/lib/auth/users";
import { validatePassword } from "@/lib/validation/password";
import type { UserRole } from "@/lib/types/database";

const createUserSchema = z.object({
  email: z.string().email(),
  admin_name: z.string().min(1, "Name required"),
  password: z.string(),
  role: z.enum(["admin", "manager", "member"]),
});

export async function adminCreateUserAction(_prev: { error?: string; ok?: boolean } | null, formData: FormData) {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    return { error: "Forbidden" };
  }

  const email = String(formData.get("email") ?? "");
  const admin_name = String(formData.get("admin_name") ?? "");
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "member");
  const parsed = createUserSchema.safeParse({ email, admin_name, password, role });
  if (!parsed.success) return { error: "Invalid payload" };

  const pw = validatePassword(password);
  if (!pw.ok) return { error: pw.message };

  const existing = await findUserByEmail(parsed.data.email);
  if (existing) return { error: "Email already registered" };

  try {
    await createUser({
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      admin_name: parsed.data.admin_name,
      role: parsed.data.role,
    });
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    return { error: msg };
  }
}

export async function adminUpdateUserRoleAction(userId: string, role: UserRole) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return { error: "Forbidden" };
  if (user.id === userId && role !== "admin") return { error: "You cannot remove your own admin access." };
  if (!["admin", "manager", "member"].includes(role)) return { error: "Invalid role" };

  await updateUserRole(userId, role);
  revalidatePath("/admin");
  revalidatePath("/tasks");
  return { ok: true as const };
}

export async function adminSetUserDisabledAction(userId: string, disabled: boolean) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return { error: "Forbidden" };
  if (user.id === userId) return { error: "You cannot disable your own account." };

  await setUserDisabled(userId, disabled);
  revalidatePath("/admin");
  return { ok: true as const };
}
