"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  adminResetUserPasswordAction,
  adminSetUserDisabledAction,
  adminUpdateUserRoleAction,
} from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { PasswordInput } from "@/components/ui/password-input";
import type { UserRole } from "@/lib/types/database";

export type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  disabled: boolean;
  lastSignIn: string | null;
};

export function UsersManager({ users }: { users: ManagedUser[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [resetTarget, setResetTarget] = useState<ManagedUser | null>(null);

  return (
    <>
    <Card className="overflow-hidden p-0 shadow-none">
      <div className="border-b border-[var(--color-border-subtle)] p-5">
        <CardTitle>Workspace users</CardTitle>
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">Manage roles and account access.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
            <tr>
              <th className="px-5 py-3 font-semibold">User</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Last sign in</th>
              <th className="px-5 py-3 text-right font-semibold">Access</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-subtle)]">
            {users.map((user) => (
              <tr key={user.id} className={user.disabled ? "opacity-55" : ""}>
                <td className="px-5 py-4">
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{user.email}</p>
                </td>
                <td className="px-4 py-4">
                  <Select
                    value={user.role}
                    disabled={pending}
                    className="w-36 py-2"
                    aria-label={`Role for ${user.name}`}
                    onChange={(event) => {
                      const role = event.target.value as UserRole;
                      startTransition(async () => {
                        const result = await adminUpdateUserRoleAction(user.id, role);
                        if (result.error) {
                          toast.error(result.error);
                          return;
                        }
                        toast.success("Role updated");
                        router.refresh();
                      });
                    }}
                  >
                    <option value="member">Member</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </Select>
                </td>
                <td className="px-4 py-4 text-[var(--color-text-secondary)]">
                  {user.lastSignIn ? new Date(user.lastSignIn).toLocaleString() : "Never"}
                </td>
                <td className="px-5 py-4 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={pending}
                    className="mr-2 px-3 py-2 text-xs"
                    onClick={() => setResetTarget(user)}
                  >
                    Reset password
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={pending}
                    className="px-3 py-2 text-xs"
                    onClick={() => startTransition(async () => {
                      const result = await adminSetUserDisabledAction(user.id, !user.disabled);
                      if (result.error) {
                        toast.error(result.error);
                        return;
                      }
                      toast.success(user.disabled ? "Account enabled" : "Account disabled");
                      router.refresh();
                    })}
                  >
                    {user.disabled ? "Enable" : "Disable"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
      <Modal
        open={Boolean(resetTarget)}
        title="Reset user password"
        onClose={() => setResetTarget(null)}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!resetTarget) return;
            const password = String(new FormData(event.currentTarget).get("password") ?? "");
            startTransition(async () => {
              const result = await adminResetUserPasswordAction(resetTarget.id, password);
              if ("error" in result && result.error) {
                toast.error(result.error);
                return;
              }
              toast.success(`Password reset for ${resetTarget.name}`);
              setResetTarget(null);
            });
          }}
        >
          <p className="text-sm text-[var(--color-text-secondary)]">
            Set a new temporary password for <strong className="text-[var(--color-text-primary)]">{resetTarget?.name}</strong>.
          </p>
          <div>
            <label className="field-label" htmlFor="reset-user-password">New temporary password</label>
            <PasswordInput
              id="reset-user-password"
              name="password"
              autoComplete="new-password"
              required
            />
            <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
              Use at least 8 characters with uppercase, number, and special character.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setResetTarget(null)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Resetting…" : "Reset password"}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

