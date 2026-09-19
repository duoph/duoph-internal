import { redirect } from "next/navigation";
import { getCurrentUser, roleForUser } from "@/lib/auth/authorization";
import { listAllUsers } from "@/lib/auth/users";
import { workTypeService } from "@/lib/api/work-types";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export default async function AdminHomePage() {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") redirect("/dashboard");
  const [workTypes, rawUsers] = await Promise.all([workTypeService.list(), listAllUsers()]);
  const users = rawUsers.map((member) => ({
    id: member._id.toString(),
    name: member.admin_name.trim() || member.email.split("@")[0] || "User",
    email: member.email,
    role: roleForUser(member),
    disabled: Boolean(member.disabled_at),
    lastSignIn: member.last_sign_in_at?.toISOString() ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Workspace control</p>
        <h1 className="page-title">Administration</h1>
        <p className="page-subtitle">Manage people, permissions, and work categories.</p>
      </div>
      <AdminDashboard workTypes={workTypes} users={users} />
    </div>
  );
}
