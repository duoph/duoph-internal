import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/authorization";
import { workTypeService } from "@/lib/api/work-types";
import { WorkTypesManager } from "@/components/admin/work-types-manager";

export default async function AdminWorkTypesPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") redirect("/dashboard");

  const workTypes = await workTypeService.list();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <p className="text-sm text-[var(--color-text-secondary)]">Add new work types for clients and cashflow</p>
      <WorkTypesManager initial={workTypes} />
    </div>
  );
}
