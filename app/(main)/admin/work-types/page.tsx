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
      <div>
        <h1 className="page-title">Work types</h1>
        <p className="text-sm text-(--color-text-secondary)">Add new work types for clients and cashflow</p>
      </div>
      <WorkTypesManager initial={workTypes} />
    </div>
  );
}
