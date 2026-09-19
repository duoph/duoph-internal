import "server-only";

import { cashflowService } from "@/lib/api/cashflow";
import type { CashflowWithClient, PeriodPoint } from "@/lib/types/database";
import { endOfMonth, endOfWeek, format, parseISO, startOfMonth, startOfWeek, subMonths, subWeeks } from "date-fns";

export const reportsService = {
  async raw() {
    return cashflowService.list();
  },

  monthlySeries(rows: CashflowWithClient[], monthsBack = 6): PeriodPoint[] {
    const points: PeriodPoint[] = [];
    const now = new Date();
    for (let i = monthsBack - 1; i >= 0; i--) {
      const d = subMonths(now, i);
      const start = startOfMonth(d);
      const end = endOfMonth(d);
      const label = format(d, "MMM yyyy");
      let income = 0;
      let expense = 0;
      for (const r of rows) {
        const rd = parseISO(r.date);
        if (rd >= start && rd <= end) {
          if (r.payment_status !== "pending") income += Number(r.income);
          expense += Number(r.expense);
        }
      }
      points.push({ label, income, expense });
    }
    return points;
  },

  weeklySeries(rows: CashflowWithClient[], weeksBack = 8): PeriodPoint[] {
    const points: PeriodPoint[] = [];
    const now = new Date();
    for (let i = weeksBack - 1; i >= 0; i--) {
      const anchor = subWeeks(now, i);
      const start = startOfWeek(anchor, { weekStartsOn: 1 });
      const end = endOfWeek(anchor, { weekStartsOn: 1 });
      const label = `${format(start, "MMM d")}`;
      let income = 0;
      let expense = 0;
      for (const r of rows) {
        const rd = parseISO(r.date);
        if (rd >= start && rd <= end) {
          if (r.payment_status !== "pending") income += Number(r.income);
          expense += Number(r.expense);
        }
      }
      points.push({ label, income, expense });
    }
    return points;
  },

  revenueByClient(rows: CashflowWithClient[]) {
    const map = new Map<string, { name: string; revenue: number }>();
    for (const r of rows) {
      const id = r.client_id ?? "_none";
      const name = r.clients?.client_name ?? "No client";
      const prev = map.get(id) ?? { name, revenue: 0 };
      if (r.payment_status !== "pending") prev.revenue += Number(r.income);
      map.set(id, prev);
    }
    return [...map.values()].sort((a, b) => b.revenue - a.revenue);
  },
};
