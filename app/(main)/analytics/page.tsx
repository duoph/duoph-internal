import { redirect } from "next/navigation";
import { TaskAnalyticsDashboard } from "@/components/analytics/task-analytics-dashboard";
import { canViewTeamAnalytics, getCurrentUser } from "@/lib/auth/authorization";
import { taskAnalyticsService } from "@/lib/api/task-analytics";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?next=/analytics");

  const teamView = canViewTeamAnalytics(user);
  const analytics = await taskAnalyticsService.get({
    viewerId: user.id,
    canViewAll: teamView,
  });

  return <TaskAnalyticsDashboard analytics={analytics} teamView={teamView} />;
}

