import { redirect } from "next/navigation";
import { reportsService } from "@/lib/api/reports";
import { ReportCharts } from "@/components/reports/report-charts";
import { canManageFinance, getCurrentUser } from "@/lib/auth/authorization";

export default async function ReportsPage() {
  const user = await getCurrentUser();
  if (!user || !canManageFinance(user)) redirect("/dashboard");

  const rows = await reportsService.raw();
  const monthly = reportsService.monthlySeries(rows, 6);
  const weekly = reportsService.weeklySeries(rows, 8);
  const byClient = reportsService.revenueByClient(rows);

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--color-text-secondary)]">Income vs expense and client mix.</p>
      <ReportCharts monthly={monthly} weekly={weekly} byClient={byClient} />
    </div>
  );
}
