"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Select } from "@/components/ui/select";
import { adminCreateUserAction } from "@/app/actions/admin";

export function AdminCreateUser() {
  const [state, formAction, pending] = useActionState(adminCreateUserAction, null);

  useEffect(() => {
    if (state?.ok) toast.success("User created");
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <Card>
      <CardTitle className="mb-4">Admin · Create user</CardTitle>
      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="admin_user_name" className="mb-1 block text-sm text-(--color-text-secondary)">
            Name
          </label>
          <Input id="admin_user_name" name="admin_name" required autoComplete="name" />
        </div>
        <div>
          <label htmlFor="admin_user_email" className="mb-1 block text-sm text-(--color-text-secondary)">
            Email
          </label>
          <Input id="admin_user_email" name="email" type="email" required autoComplete="email" />
        </div>
        <div>
          <label htmlFor="admin_user_role" className="mb-1 block text-sm text-(--color-text-secondary)">
            Role
          </label>
          <Select id="admin_user_role" name="role" defaultValue="member">
            <option value="member">Member</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </Select>
        </div>
        <div>
          <label htmlFor="admin_user_password" className="mb-1 block text-sm text-(--color-text-secondary)">
            Temporary password
          </label>
          <PasswordInput id="admin_user_password" name="password" autoComplete="new-password" required />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create user"}
        </Button>
      </form>
    </Card>
  );
}

