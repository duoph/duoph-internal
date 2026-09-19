"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { CashflowWithClient, ClientRow, WorkTypeRow } from "@/lib/types/database";
import {
  createCashflowAction,
  deleteCashflowAction,
  updateCashflowAction,
} from "@/app/actions/cashflow";
import { cashflowTotals } from "@/lib/utils/cashflow";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeaderActions } from "@/components/layout/page-chrome";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Table, Th, Td } from "@/components/ui/table";
import { RowActions } from "@/components/ui/row-actions";
import { Badge } from "@/components/ui/badge";
import { workTypeBadgeClass } from "@/lib/utils/work-type";
import { formatDate, formatMoney } from "@/lib/utils/format";

type Props = {
  initialRows: CashflowWithClient[];
  clients: Pick<ClientRow, "id" | "client_name">[];
  workTypes: WorkTypeRow[];
};

export function CashflowView({ initialRows, clients, workTypes }: Props) {
  const router = useRouter();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [clientId, setClientId] = useState("");
  const [workType, setWorkType] = useState<string>("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<CashflowWithClient | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; summary: string } | null>(null);
  const [, startTransition] = useTransition();

  const [optimisticRows, setRowRemoved] = useOptimistic(
    initialRows,
    (state, removedId: string) => state.filter((r) => r.id !== removedId),
  );

  const filtered = useMemo(() => {
    return optimisticRows.filter((r) => {
      if (from && r.date < from) return false;
      if (to && r.date > to) return false;
      if (clientId && r.client_id !== clientId) return false;
      if (workType && r.work_type !== workType) return false;
      if (paymentStatus && r.payment_status !== paymentStatus) return false;
      return true;
    });
  }, [optimisticRows, from, to, clientId, workType, paymentStatus]);

  const totals = cashflowTotals(filtered);

  return (
    <div className="space-y-6">
      <PageHeaderActions>
        <Button type="button" className="h-9 px-3.5 py-0 text-xs" onClick={() => setModal("create")}>
          Add entry
        </Button>
      </PageHeaderActions>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-xs uppercase text-(--color-text-muted)">Income</p>
          <p className="mt-2 text-xl font-semibold text-[var(--color-primary)]">{formatMoney(totals.income)}</p>
        </Card>
        <Card className="border-orange-100 bg-[var(--color-accent-soft)]">
          <p className="text-xs uppercase text-(--color-text-muted)">Pending to receive</p>
          <p className="mt-2 text-xl font-semibold text-[var(--color-accent)]">{formatMoney(totals.pending)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-(--color-text-muted)">Expense</p>
          <p className="mt-2 text-xl font-semibold text-red-400">{formatMoney(totals.expense)}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-(--color-text-muted)">Balance</p>
          <p className="mt-2 text-xl font-semibold text-[var(--color-text-primary)]">{formatMoney(totals.balance)}</p>
        </Card>
      </div>

      <Card>
        <details className="group mb-5">
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-[var(--color-text-primary)]">
            <span>Filters</span>
            <span className="text-xs font-normal text-[var(--color-text-muted)] group-open:hidden">Show</span>
            <span className="hidden text-xs font-normal text-[var(--color-text-muted)] group-open:inline">Hide</span>
          </summary>
        <div className="mt-4 flex flex-wrap gap-3 border-t border-[var(--color-border-subtle)] pt-4">
          <div>
            <label className="mb-1 block text-xs text-(--color-text-muted)">From</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-(--color-text-muted)">To</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-(--color-text-muted)">Client</label>
            <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
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
            <Select value={workType} onChange={(e) => setWorkType(e.target.value)}>
              <option value="">All</option>
              {workTypes.map((w) => (
                <option key={w.key} value={w.key}>
                  {w.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-(--color-text-muted)">Payment status</label>
            <Select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
              <option value="">All</option>
              <option value="received">Received</option>
              <option value="pending">Pending to receive</option>
            </Select>
          </div>
        </div>
        </details>

        <Table>
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Client</Th>
              <Th>Type</Th>
              <Th>Details</Th>
              <Th>Payment</Th>
              <Th className="text-right">Income</Th>
              <Th className="text-right">Expense</Th>
              <Th className="w-12 pr-3"><span className="sr-only">Actions</span></Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr
                key={r.id}
                className="cursor-pointer hover:bg-slate-50"
                onClick={() => {
                  setEditing(r);
                  setModal("edit");
                }}
              >
                <Td>{formatDate(r.date)}</Td>
                <Td>{r.clients?.client_name ?? "—"}</Td>
                <Td>
                  <Badge className={workTypeBadgeClass(r.work_type)}>
                    {workTypes.find((w) => w.key === r.work_type)?.label ?? r.work_type}
                  </Badge>
                </Td>
                <Td className="max-w-[200px] truncate">{r.details ?? "—"}</Td>
                <Td>
                  <Badge
                    className={
                      r.payment_status === "pending"
                        ? "border-orange-200 bg-orange-50 text-[var(--color-accent)]"
                        : "border-emerald-200 bg-emerald-50 text-[var(--color-primary)]"
                    }
                  >
                    {r.payment_status === "pending" ? "Pending" : "Received"}
                  </Badge>
                </Td>
                <Td className="text-right tabular-nums text-[var(--color-primary)]">
                  {Number(r.income) ? formatMoney(Number(r.income)) : "—"}
                </Td>
                <Td className="text-right tabular-nums text-red-400">
                  {Number(r.expense) ? formatMoney(Number(r.expense)) : "—"}
                </Td>
                <Td className="text-right">
                  <RowActions
                    onEdit={() => {
                      setEditing(r);
                      setModal("edit");
                    }}
                    onDelete={() =>
                      setDeleteTarget({
                        id: r.id,
                        summary: [
                          formatDate(r.date),
                          r.clients?.client_name ?? "No client",
                          Number(r.income) > 0 ? `in ${formatMoney(Number(r.income))}` : "",
                          Number(r.expense) > 0 ? `out ${formatMoney(Number(r.expense))}` : "",
                          r.details ? `· ${r.details}` : "",
                        ]
                          .filter(Boolean)
                          .join(" "),
                      })
                    }
                  />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <TxModal
        open={modal === "create"}
        title="New transaction"
        clients={clients}
        workTypes={workTypes}
        onClose={() => setModal(null)}
        onSaved={() => {
          setModal(null);
          router.refresh();
        }}
      />
      <TxModal
        open={modal === "edit"}
        title="Edit transaction"
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
        title="Delete this transaction?"
        description={
          deleteTarget
            ? `Remove this entry: ${deleteTarget.summary}. This cannot be undone.`
            : ""
        }
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          const id = deleteTarget.id;
          startTransition(() => setRowRemoved(id));
          const res = await deleteCashflowAction(id);
          if ("error" in res && res.error) {
            toast.error(res.error);
            router.refresh();
            throw new Error(res.error);
          }
          toast.success("Deleted");
          router.refresh();
        }}
      />
    </div>
  );
}

function TxModal({
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
  clients: Pick<ClientRow, "id" | "client_name">[];
  workTypes: WorkTypeRow[];
  initial?: CashflowWithClient;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const client_id_raw = String(fd.get("client_id"));
    const payload = {
      date: String(fd.get("date")),
      income: Number(fd.get("income") || 0),
      expense: Number(fd.get("expense") || 0),
      payment_status: String(fd.get("payment_status") ?? "received") as "received" | "pending",
      details: String(fd.get("details") ?? ""),
      client_id: client_id_raw ? client_id_raw : null,
        work_type: String(fd.get("work_type")),
    };
    startTransition(async () => {
      if (initial) {
        const res = await updateCashflowAction(initial.id, payload);
        if ("error" in res && res.error) {
          toast.error(res.error);
          return;
        }
        toast.success("Updated");
      } else {
        const res = await createCashflowAction(payload);
        if ("error" in res && res.error) {
          toast.error(res.error);
          return;
        }
        toast.success("Created");
      }
      await onSaved();
    });
  }

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-(--color-text-secondary)">Date</label>
          <Input
            name="date"
            type="date"
            required
            defaultValue={initial?.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-(--color-text-secondary)">Income</label>
            <Input name="income" type="number" step="0.01" min="0" defaultValue={initial?.income ?? 0} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-(--color-text-secondary)">Expense</label>
            <Input name="expense" type="number" step="0.01" min="0" defaultValue={initial?.expense ?? 0} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-(--color-text-secondary)">Payment status</label>
          <Select name="payment_status" defaultValue={initial?.payment_status ?? "received"}>
            <option value="received">Received</option>
            <option value="pending">Pending to receive</option>
          </Select>
          <p className="mt-1 text-[11px] text-(--color-text-muted)">
            Pending income is excluded from the current balance until marked received.
          </p>
        </div>
        <div>
          <label className="mb-1 block text-xs text-(--color-text-secondary)">Details</label>
          <Input name="details" defaultValue={initial?.details ?? ""} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-(--color-text-secondary)">Client</label>
          <Select name="client_id" defaultValue={initial?.client_id ?? ""}>
            <option value="">None</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.client_name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-(--color-text-secondary)">Work type</label>
          <Select name="work_type" defaultValue={initial?.work_type ?? "website"}>
            {workTypes.map((w) => (
              <option key={w.key} value={w.key}>
                {w.label}
              </option>
            ))}
          </Select>
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
