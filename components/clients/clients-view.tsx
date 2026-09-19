"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ClientRow, WorkTypeRow } from "@/lib/types/database";
import { createClientAction, deleteClientAction, updateClientAction } from "@/app/actions/clients";
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
import { workTypeBadgeClass } from "@/lib/utils/work-type";
import { formatDate, formatMoney } from "@/lib/utils/format";

type Props = {
  initialClients: ClientRow[];
  profileName: string;
  workTypes: WorkTypeRow[];
  canViewFinance: boolean;
};

export function ClientsView({ initialClients, profileName, workTypes, canViewFinance }: Props) {
  const router = useRouter();
  const [view, setView] = useState<"table" | "cards">("table");
  const [filterType, setFilterType] = useState<string>("");
  const [filterCountry, setFilterCountry] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<ClientRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClientRow | null>(null);

  const filtered = useMemo(() => {
    return initialClients.filter((c) => {
      if (filterType && c.work_type !== filterType) return false;
      if (filterCountry && !c.country.toLowerCase().includes(filterCountry.toLowerCase())) return false;
      return true;
    });
  }, [initialClients, filterType, filterCountry]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <PageHeaderActions>
        <Button type="button" className="h-9 px-3 py-0 text-xs" variant={view === "table" ? "primary" : "secondary"} onClick={() => setView("table")}>
          Table
        </Button>
        <Button type="button" className="h-9 px-3 py-0 text-xs" variant={view === "cards" ? "primary" : "secondary"} onClick={() => setView("cards")}>
          Cards
        </Button>
        <Button type="button" className="h-9 px-3.5 py-0 text-xs" onClick={() => setModal("create")}>
          Add client
        </Button>
      </PageHeaderActions>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden p-0 shadow-none">
        <div className="flex shrink-0 flex-wrap items-end gap-3 border-b border-[var(--color-border-subtle)] p-4">
          <div className="min-w-[140px] flex-1">
            <label className="mb-1 block text-xs text-(--color-text-muted)">Work type</label>
            <Select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">All</option>
              {workTypes.map((w) => (
                <option key={w.key} value={w.key}>
                  {w.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="min-w-[140px] flex-1">
            <label className="mb-1 block text-xs text-(--color-text-muted)">Country</label>
            <Input value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)} placeholder="Filter" />
          </div>
          <p className="pb-2 text-xs text-[var(--color-text-muted)]">
            {filtered.length} {filtered.length === 1 ? "client" : "clients"}
          </p>
        </div>

        {view === "table" ? (
          <Table className="min-h-0 flex-1 overflow-auto rounded-none border-0">
            <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_var(--color-border-subtle)]">
              <tr>
                <Th className="sticky left-0 z-20 min-w-52 bg-white">Name</Th>
                <Th>Email</Th>
                <Th>Phone</Th>
                <Th>Country</Th>
                <Th>Type</Th>
                {canViewFinance ? <Th className="text-right">Project value</Th> : null}
                <Th>Admin</Th>
                <Th>Created</Th>
                <Th className="sticky right-0 z-20 w-12 bg-white pr-3"><span className="sr-only">Actions</span></Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="group cursor-pointer hover:bg-slate-50"
                  onClick={() => {
                    setEditing(c);
                    setModal("edit");
                  }}
                >
                  <Td className="sticky left-0 bg-white font-medium group-hover:bg-slate-50">{c.client_name}</Td>
                  <Td>{c.email?.trim() ? c.email : "—"}</Td>
                  <Td>{c.contact_number?.trim() ? c.contact_number : "—"}</Td>
                  <Td>{c.country || "—"}</Td>
                  <Td>
                    <Badge className={workTypeBadgeClass(c.work_type)}>
                      {workTypes.find((w) => w.key === c.work_type)?.label ?? c.work_type}
                    </Badge>
                  </Td>
                  {canViewFinance ? <Td className="text-right font-medium">{formatMoney(c.project_value)}</Td> : null}
                  <Td>{c.admin_name ?? "—"}</Td>
                  <Td>{formatDate(c.created_at)}</Td>
                  <Td className="sticky right-0 bg-white text-right group-hover:bg-slate-50">
                    <RowActions
                      onEdit={() => {
                        setEditing(c);
                        setModal("edit");
                      }}
                      onDelete={() => setDeleteTarget(c)}
                    />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <div className="grid min-h-0 flex-1 content-start gap-4 overflow-y-auto p-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <Card
                key={c.id}
                className="cursor-pointer border-(--color-border-default)"
                onClick={() => {
                  setEditing(c);
                  setModal("edit");
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{c.client_name}</CardTitle>
                  <div className="flex items-center gap-1">
                    <Badge className={workTypeBadgeClass(c.work_type)}>
                      {workTypes.find((w) => w.key === c.work_type)?.label ?? c.work_type}
                    </Badge>
                    <RowActions
                      onEdit={() => {
                        setEditing(c);
                        setModal("edit");
                      }}
                      onDelete={() => setDeleteTarget(c)}
                    />
                  </div>
                </div>
                <p className="mt-2 text-sm text-(--color-text-secondary)">{c.email?.trim() ? c.email : "—"}</p>
                <p className="text-sm text-(--color-text-secondary)">
                  {c.contact_number?.trim() ? c.contact_number : "—"}
                </p>
                <p className="text-xs text-(--color-text-muted)">{c.country || "—"}</p>
                {canViewFinance ? <p className="mt-2 text-sm font-semibold text-[var(--color-primary)]">{formatMoney(c.project_value)}</p> : null}
              </Card>
            ))}
          </div>
        )}
      </Card>

      <ClientModal
        open={modal === "create"}
        title="New client"
        profileName={profileName}
        workTypes={workTypes}
        canViewFinance={canViewFinance}
        onClose={() => setModal(null)}
        onSaved={async () => {
          setModal(null);
          router.refresh();
        }}
      />
      <ClientModal
        open={modal === "edit"}
        title="Edit client"
        profileName={profileName}
        workTypes={workTypes}
        canViewFinance={canViewFinance}
        initial={editing ?? undefined}
        onClose={() => {
          setModal(null);
          setEditing(null);
        }}
        onSaved={async () => {
          setModal(null);
          setEditing(null);
          router.refresh();
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this client?"
        description={
          deleteTarget
            ? `“${deleteTarget.client_name}” will be removed. Cashflow entries stay, but may show no client link. This cannot be undone.`
            : ""
        }
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          const id = deleteTarget.id;
          const res = await deleteClientAction(id);
          if ("error" in res && res.error) {
            toast.error(res.error);
            router.refresh();
            throw new Error(res.error);
          }
          toast.success("Client removed");
          router.refresh();
        }}
      />
    </div>
  );
}

function ClientModal({
  open,
  title,
  profileName,
  workTypes,
  canViewFinance,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  title: string;
  profileName: string;
  workTypes: WorkTypeRow[];
  canViewFinance: boolean;
  initial?: ClientRow;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [pending, startTransition] = useTransition();

  function normalizePhone(raw: string) {
    const v = raw.trim().replace(/[\s().-]/g, "");
    if (!v) return "";
    if (v.startsWith("+")) return `+${v.slice(1).replace(/\D/g, "")}`;
    return v.replace(/\D/g, "");
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const basePayload = {
      client_name: String(fd.get("client_name")),
      email: String(fd.get("email") ?? "").trim(),
      contact_number: normalizePhone(String(fd.get("contact_number") ?? "")),
      country: String(fd.get("country")),
      work_type: String(fd.get("work_type")),
      admin_name: String(fd.get("admin_name")),
    };
    startTransition(async () => {
      if (initial) {
        const res = await updateClientAction(initial.id, {
          ...basePayload,
          ...(fd.has("project_value") ? { project_value: Number(fd.get("project_value") || 0) } : {}),
        });
        if ("error" in res && res.error) {
          toast.error(res.error);
          return;
        }
        toast.success("Client updated");
      } else {
        const res = await createClientAction({
          ...basePayload,
          project_value: Number(fd.get("project_value") || 0),
        });
        if ("error" in res && res.error) {
          toast.error(res.error);
          return;
        }
        toast.success("Client created");
      }
      await onSaved();
    });
  }

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-(--color-text-secondary)">Name</label>
          <Input name="client_name" required defaultValue={initial?.client_name} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-(--color-text-secondary)">Email</label>
          <Input name="email" type="email" defaultValue={initial?.email} placeholder="Optional" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-(--color-text-secondary)">Contact number</label>
          <Input
            name="contact_number"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+91 98765 43210"
            maxLength={25}
            defaultValue={initial?.contact_number ?? ""}
          />
          <p className="mt-1 text-xs text-(--color-text-muted)">Include country code, e.g. +91...</p>
        </div>
        <div>
          <label className="mb-1 block text-xs text-(--color-text-secondary)">Country</label>
          <Input name="country" defaultValue={initial?.country} />
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
        {!initial || canViewFinance ? (
          <div>
            <label className="mb-1 block text-xs text-(--color-text-secondary)">Project price</label>
            <Input
              name="project_value"
              type="number"
              min="0"
              step="0.01"
              defaultValue={initial?.project_value ?? 0}
              required={!initial}
            />
            {!canViewFinance ? (
              <p className="mt-1 text-xs text-(--color-text-muted)">
                Managers can view this value after the client is created.
              </p>
            ) : null}
          </div>
        ) : null}
        <div>
          <label className="mb-1 block text-xs text-(--color-text-secondary)">Admin name</label>
          <Input name="admin_name" defaultValue={initial?.admin_name ?? profileName} />
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
