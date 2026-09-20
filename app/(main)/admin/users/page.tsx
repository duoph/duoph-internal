import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/authorization";
import { AdminCreateUser } from "@/components/settings/admin-create-user";

export const metadata: Metadata = {
  title: "Users",
  description: "Create and manage Duoph workspace accounts.",
};

export default async function AdminUsersPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") redirect("/dashboard");

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <p className="text-sm text-[var(--color-text-secondary)]">Create new users (no OTP)</p>
      <AdminCreateUser />
    </div>
  );
}
