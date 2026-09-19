"use client";

import { useMemo, useState } from "react";
import type { WorkTypeRow } from "@/lib/types/database";
import { cn } from "@/lib/utils/cn";
import { Card } from "@/components/ui/card";
import { AdminCreateUser } from "@/components/settings/admin-create-user";
import { WorkTypesManager } from "@/components/admin/work-types-manager";
import { UsersManager, type ManagedUser } from "@/components/admin/users-manager";

type Tab = "users" | "work_types";

export function AdminDashboard({ workTypes, users }: { workTypes: WorkTypeRow[]; users: ManagedUser[] }) {
  const [tab, setTab] = useState<Tab>("users");

  const items = useMemo(
    () =>
      [
        { id: "users" as const, label: "Users" },
        { id: "work_types" as const, label: "Work types" },
      ] satisfies { id: Tab; label: string }[],
    [],
  );

  return (
    <div className="space-y-5">
      <Card className="inline-flex border-(--color-border-default) p-1 shadow-none">
        <div className="flex gap-1">
          {items.map((i) => (
            <button
              key={i.id}
              type="button"
              onClick={() => setTab(i.id)}
              className={cn(
                "rounded-[10px] px-4 py-2 text-sm font-medium transition-colors",
                tab === i.id
                  ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                  : "text-(--color-text-secondary) hover:bg-slate-50 hover:text-[var(--color-text-primary)]",
              )}
            >
              {i.label}
            </button>
          ))}
        </div>
      </Card>

      <div className="min-w-0">
        {tab === "users" ? (
          <div className="space-y-5">
            <UsersManager users={users} />
            <AdminCreateUser />
          </div>
        ) : null}
        {tab === "work_types" ? <WorkTypesManager initial={workTypes} /> : null}
      </div>
    </div>
  );
}

