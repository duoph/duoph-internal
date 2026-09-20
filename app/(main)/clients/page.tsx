import type { Metadata } from "next";
import { clientService } from "@/lib/api/clients";
import { profileService } from "@/lib/api/profile";
import { workTypeService } from "@/lib/api/work-types";
import { ClientsView } from "@/components/clients/clients-view";
import { canManageFinance, getCurrentUser } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Clients",
  description: "Customer records, project context, and the people Duoph is working with.",
};

export default async function ClientsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [clients, profile, workTypes] = await Promise.all([
    clientService.list(),
    profileService.get(user.id),
    workTypeService.list(),
  ]);
  const showFinance = canManageFinance(user);
  const visibleClients = showFinance
    ? clients
    : clients.map((client) => ({ ...client, project_value: 0 }));

  return (
    <ClientsView
      initialClients={visibleClients}
      profileName={profile?.admin_name ?? ""}
      workTypes={workTypes}
      canViewFinance={showFinance}
    />
  );
}
