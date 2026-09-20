import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { cashflowService } from "@/lib/api/cashflow";
import { clientService } from "@/lib/api/clients";
import { workTypeService } from "@/lib/api/work-types";
import { CashflowView } from "@/components/cashflow/cashflow-view";
import { canManageFinance, getCurrentUser } from "@/lib/auth/authorization";

export const metadata: Metadata = {
  title: "Cashflow",
  description: "Income, spend, and pending money across Duoph clients.",
};

export default async function CashflowPage() {
  const user = await getCurrentUser();
  if (!user || !canManageFinance(user)) redirect("/dashboard");

  const [rows, clients, workTypes] = await Promise.all([
    cashflowService.list(),
    clientService.list(),
    workTypeService.list(),
  ]);
  const clientOptions = clients.map((c) => ({ id: c.id, client_name: c.client_name }));
  return <CashflowView initialRows={rows} clients={clientOptions} workTypes={workTypes} />;
}
