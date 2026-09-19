"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import type { WorkTypeRow } from "@/lib/types/database";
import { upsertWorkTypeAction, deleteWorkTypeAction } from "@/app/actions/work-types";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function WorkTypesManager({ initial }: { initial: WorkTypeRow[] }) {
  const [state, formAction, pending] = useActionState(upsertWorkTypeAction, null);

  useEffect(() => {
    if (state?.ok) toast.success("Saved");
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle className="mb-4">Add / update work type</CardTitle>
        <form action={formAction} className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-(--color-text-secondary)">Key</label>
            <Input name="key" placeholder="e.g. seo_audit" required />
            <p className="mt-1 text-xs text-(--color-text-muted)">lowercase, numbers, underscore</p>
          </div>
          <div>
            <label className="mb-1 block text-xs text-(--color-text-secondary)">Label</label>
            <Input name="label" placeholder="e.g. SEO Audit" required />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <CardTitle className="mb-4">Existing</CardTitle>
        {initial.length === 0 ? (
          <p className="text-sm text-(--color-text-secondary)">No work types yet.</p>
        ) : (
          <ul className="space-y-2">
            {initial.map((w) => (
              <li
                key={w.key}
                className="flex items-center justify-between gap-3 rounded-[10px] border border-(--color-border-subtle) px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">{w.label}</p>
                  <p className="truncate text-xs text-(--color-text-muted)">{w.key}</p>
                </div>
                <Button
                  type="button"
                  variant="danger"
                  className="shrink-0"
                  onClick={async () => {
                    const res = await deleteWorkTypeAction(w.key);
                    if ("error" in res && res.error) toast.error(res.error);
                    else toast.success("Deleted");
                  }}
                >
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

