import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/authorization";
import { AdminCreateUser } from "@/components/settings/admin-create-user";

export default async function AdminUsersPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") redirect("/dashboard");

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="page-title">Users</h1>
        <p className="text-sm text-(--color-text-secondary)">Create new users (no OTP)</p>
      </div>
      <AdminCreateUser />
    </div>
  );
}
