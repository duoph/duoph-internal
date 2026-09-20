const MONEY_LOCALE = "en-IN";
const MONEY_CURRENCY = "INR";

export function formatMoney(n: number, currency: string = MONEY_CURRENCY) {
  return new Intl.NumberFormat(MONEY_LOCALE, { style: "currency", currency }).format(n);
}

export function formatDate(iso: string) {
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00Z" : ""));
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatFriendlyDate(iso: string) {
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00Z" : ""));
  return new Intl.DateTimeFormat("en", { month: "long", day: "numeric", timeZone: "UTC" }).format(d);
}
