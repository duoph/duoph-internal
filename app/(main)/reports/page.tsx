import { reportsService } from "@/lib/api/reports";
import { ReportCharts } from "@/components/reports/report-charts";

export default async function ReportsPage() {
  const rows = await reportsService.raw();
  const monthly = reportsService.monthlySeries(rows, 6);
  const weekly = reportsService.weeklySeries(rows, 8);
  const byClient = reportsService.revenueByClient(rows);

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Financial intelligence</p>
        <h1 className="page-title">Reports</h1>
        <p className="page-subtitle">Income vs expense and client mix.</p>
      </div>
      <ReportCharts monthly={monthly} weekly={weekly} byClient={byClient} />
    </div>
  );
}
