"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ClientRow, WorkStatus, WorkTypeRow } from "@/lib/types/database";
import type { WorkItemWithClient } from "@/lib/types/database";
import { createWorkItemAction, deleteWorkItemAction, updateWorkItemAction } from "@/app/actions/work-items";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeaderActions } from "@/components/layout/page-chrome";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Table, Th, Td } from "@/components/ui/table";
import { RowActions } from "@/components/ui/row-actions";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const STATUSES: { key: WorkStatus; label: string; badge: string }[] = [
  { key: "pending", label: "Pending", badge: "bg-gray-500/15 text-gray-300 border-gray-500/30" },
  { key: "ongoing", label: "Ongoing", badge: "border-emerald-200 bg-emerald-50 text-[var(--color-primary)]" },
  { key: "on_hold", label: "On Hold", badge: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  { key: "completed", label: "Completed", badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
];

function statusLabel(s: string) {
  return STATUSES.find((x) => x.key === s)?.label ?? s;
}
function statusBadge(s: string) {
  return STATUSES.find((x) => x.key === s)?.badge ?? "bg-gray-500/15 text-gray-300 border-gray-500/30";
}

type Props = {
  initialRows: WorkItemWithClient[];
  total: number;
  clients: Pick<ClientRow, "id" | "client_name">[];
  workTypes: WorkTypeRow[];
};

export function WorkView({ initialRows, total, clients, workTypes }: Props) {
  const router = useRouter();
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<WorkItemWithClient | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkItemWithClient | null>(null);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [clientId, setClientId] = useState("");
  const [workType, setWorkType] = useState("");
  const [sort, setSort] = useState<"created_at" | "committed_date" | "completed_date" | "status">("created_at");
  const [dir, setDir] = useState<"desc" | "asc">("desc");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const filteredRows = useMemo(() => initialRows, [initialRows]);

  function refreshWithParams(next: Partial<Record<string, string>>) {
    const sp = new URLSearchParams(window.location.search);
    Object.entries(next).forEach(([k, v]) => {
      if (!v) sp.delete(k);
      else sp.set(k, v);
    });
    router.push(`/work?${sp.toString()}`);
  }

  return (
    <div className="space-y-6">
      <PageHeaderActions>
        <Button type="button" className="h-9 px-3.5 py-0 text-xs" onClick={() => setModal("create")}>
          Add work
        </Button>
      </PageHeaderActions>

      <Card>
        <CardTitle className="mb-4">Filters</CardTitle>
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs text-(--color-text-muted)">Search</label>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Work / remarks"
              onKeyDown={(e) => {
                if (e.key === "Enter") refreshWithParams({ q, page: "1" });
              }}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-(--color-text-muted)">Status</label>
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                refreshWithParams({ status: e.target.value, page: "1" });
              }}
            >
              <option value="">All</option>
              {STATUSES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-(--color-text-muted)">Client</label>
            <Select
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                refreshWithParams({ client_id: e.target.value, page: "1" });
              }}
            >
              <option value="">All</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.client_name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-(--color-text-muted)">Work type</label>
            <Select
              value={workType}
              onChange={(e) => {
                setWorkType(e.target.value);
                refreshWithParams({ work_type: e.target.value, page: "1" });
              }}
            >
              <option value="">All</option>
              {workTypes.map((w) => (
                <option key={w.key} value={w.key}>
                  {w.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-(--color-text-muted)">Sort</label>
            <Select
              value={`${sort}:${dir}`}
              onChange={(e) => {
                const [s, d] = e.target.value.split(":");
                const nextSort =
                  s === "created_at" || s === "committed_date" || s === "completed_date" || s === "status" ? s : "created_at";
                const nextDir = d === "asc" || d === "desc" ? d : "desc";
                setSort(nextSort);
                setDir(nextDir);
                refreshWithParams({ sort: nextSort, dir: nextDir, page: "1" });
              }}
            >
              <option value="created_at:desc">Newest</option>
              <option value="committed_date:asc">Committed date ↑</option>
              <option value="committed_date:desc">Committed date ↓</option>
              <option value="completed_date:asc">Completed date ↑</option>
              <option value="completed_date:desc">Completed date ↓</option>
              <option value="status:asc">Status ↑</option>
              <option value="status:desc">Status ↓</option>
            </Select>
          </div>
        </div>

        <Table>
          <thead>
            <tr>
              <Th>Work</Th>
              <Th>Client</Th>
              <Th>Type</Th>
              <Th>Status</Th>
              <Th>Committed</Th>
              <Th>Completed</Th>
              <Th className="w-12 pr-3"><span className="sr-only">Actions</span></Th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r) => (
              <tr
                key={r.id}
                className="cursor-pointer hover:bg-slate-50"
                onClick={() => {
                  setEditing(r);
                  setModal("edit");
                }}
              >
                <Td className="font-medium">
                  <div className="min-w-0">
                    <p className="truncate">{r.work}</p>
                    {r.remarks?.trim() ? (
                      <p className="truncate text-xs text-(--color-text-muted)">{r.remarks}</p>
                    ) : null}
                  </div>
                </Td>
                <Td>{r.clients?.client_name ?? "—"}</Td>
                <Td>{workTypes.find((w) => w.key === r.work_type)?.label ?? r.work_type}</Td>
                <Td>
                  <Badge className={statusBadge(r.status)}>{statusLabel(r.status)}</Badge>
                </Td>
                <Td>{r.committed_date ? formatDate(r.committed_date) : "—"}</Td>
                <Td>{r.completed_date ? formatDate(r.completed_date) : "—"}</Td>
                <Td className="text-right">
                  <RowActions
                    onEdit={() => {
                      setEditing(r);
                      setModal("edit");
                    }}
                    onDelete={() => setDeleteTarget(r)}
                  />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-(--color-text-muted)">
            {total} total · page {page} of {pageCount}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={page <= 1}
              onClick={() => {
                const next = String(Math.max(1, page - 1));
                setPage(Number(next));
                refreshWithParams({ page: next });
              }}
            >
              Prev
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={page >= pageCount}
              onClick={() => {
                const next = String(Math.min(pageCount, page + 1));
                setPage(Number(next));
                refreshWithParams({ page: next });
              }}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      <WorkModal
        open={modal === "create"}
        title="New work"
        clients={clients}
        workTypes={workTypes}
        onClose={() => setModal(null)}
        onSaved={() => {
          setModal(null);
          router.refresh();
        }}
      />
      <WorkModal
        open={modal === "edit"}
        title="Edit work"
        clients={clients}
        workTypes={workTypes}
        initial={editing ?? undefined}
        onClose={() => {
          setModal(null);
          setEditing(null);
        }}
        onSaved={() => {
          setModal(null);
          setEditing(null);
          router.refresh();
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this work?"
        description={deleteTarget ? `“${deleteTarget.work}” will be removed. This cannot be undone.` : ""}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          const res = await deleteWorkItemAction(deleteTarget.id);
          if ("error" in res && res.error) {
            toast.error(res.error);
            throw new Error(res.error);
          }
          toast.success("Deleted");
          router.refresh();
        }}
      />
    </div>
  );
}

function WorkModal({
  open,
  title,
  clients,
  workTypes,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  title: string;
  clients: { id: string; client_name: string }[];
  workTypes: WorkTypeRow[];
  initial?: WorkItemWithClient;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const payload = {
            work: String(fd.get("work") ?? ""),
            client_id: String(fd.get("client_id") ?? ""),
            work_type: String(fd.get("work_type") ?? ""),
            status: String(fd.get("status") ?? "pending") as WorkStatus,
            committed_date: String(fd.get("committed_date") ?? ""),
            completed_date: String(fd.get("completed_date") ?? ""),
            remarks: String(fd.get("remarks") ?? ""),
          };

          startTransition(async () => {
            const res = initial
              ? await updateWorkItemAction(initial.id, payload)
              : await createWorkItemAction(payload);
            if ("error" in res && res.error) {
              toast.error(res.error);
              return;
            }
            toast.success(initial ? "Updated" : "Created");
            router.refresh();
            await onSaved();
          });
        }}
      >
        <div>
          <label className="mb-1 block text-xs text-(--color-text-secondary)">Work</label>
          <Input name="work" required defaultValue={initial?.work ?? ""} placeholder="Work description" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-(--color-text-secondary)">Client</label>
          <Select name="client_id" required defaultValue={initial?.client_id ?? ""}>
            <option value="" disabled>
              Select client
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.client_name}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-(--color-text-secondary)">Work type</label>
            <Select name="work_type" required defaultValue={initial?.work_type ?? "other"}>
              {workTypes.map((w) => (
                <option key={w.key} value={w.key}>
                  {w.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-(--color-text-secondary)">Status</label>
            <Select name="status" defaultValue={initial?.status ?? "pending"}>
              {STATUSES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-(--color-text-secondary)">Committed date</label>
            <Input name="committed_date" type="date" defaultValue={initial?.committed_date ?? ""} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-(--color-text-secondary)">Completed date</label>
            <Input
              name="completed_date"
              type="date"
              defaultValue={initial?.completed_date ?? ""}
              className={cn("")}
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-(--color-text-secondary)">Remarks</label>
          <Input name="remarks" defaultValue={initial?.remarks ?? ""} placeholder="Optional" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

