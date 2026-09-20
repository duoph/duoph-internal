import { OverviewView } from "@/components/dashboard/overview-view";
import { dashboardService } from "@/lib/api/dashboard";
import { workTypeService } from "@/lib/api/work-types";
import { canManageFinance, getCurrentUser } from "@/lib/auth/authorization";
import { taskAnalyticsService } from "@/lib/api/task-analytics";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const canFinance = canManageFinance(user);
  const analytics = await taskAnalyticsService.get({
    viewerId: user.id,
    canViewAll: true,
  });

  const finance = canFinance
    ? await Promise.all([dashboardService.metrics(), workTypeService.list()])
    : null;

  return (
    <OverviewView
      firstName={user.name.split(" ")[0] ?? "there"}
      currentUserId={user.id}
      canFinance={canFinance}
      analytics={analytics}
      clients={finance?.[0].totalClients}
      balance={finance?.[0].balance}
      recentTransactions={finance?.[0].recentTransactions}
      workTypeLabels={
        finance
          ? Object.fromEntries(finance[1].map((type) => [type.key, type.label]))
          : undefined
      }
    />
  );
}
