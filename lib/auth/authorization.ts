import "server-only";

import { getSession } from "@/lib/auth/session";
import { findUserById, type UserDoc } from "@/lib/auth/users";
import { isAdminEmail } from "@/lib/auth/admin";
import type { UserRole } from "@/lib/types/database";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

export function roleForUser(user: Pick<UserDoc, "email" | "role">): UserRole {
  if (isAdminEmail(user.email)) return "admin";
  return user.role ?? "member";
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getSession();
  if (!session) return null;

  const user = await findUserById(session.id);
  if (!user || user.disabled_at) return null;

  return {
    id: user._id.toString(),
    email: user.email,
    name: user.admin_name.trim() || user.email.split("@")[0] || "User",
    role: roleForUser(user),
  };
}

export function canManageTasks(user: CurrentUser) {
  return user.role === "admin" || user.role === "manager";
}

export function canViewTeamAnalytics(user: CurrentUser) {
  return user.role === "admin" || user.role === "manager";
}

