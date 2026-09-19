import type { CashflowRow } from "@/lib/types/database";

export function cashflowTotals(rows: Pick<CashflowRow, "income" | "expense" | "payment_status">[]) {
  const income = rows.reduce(
    (sum, row) => sum + (row.payment_status === "pending" ? 0 : Number(row.income)),
    0,
  );
  const pending = rows.reduce(
    (sum, row) => sum + (row.payment_status === "pending" ? Number(row.income) : 0),
    0,
  );
  const expense = rows.reduce((s, r) => s + Number(r.expense), 0);
  return { income, pending, expense, balance: income - expense };
}
