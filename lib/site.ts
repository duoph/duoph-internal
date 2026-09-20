export const siteConfig = {
  name: "Duoph Operations",
  shortName: "Duoph",
  applicationName: "Duoph Operations",
  tagline: "One team. One workspace.",
  description:
    "Internal operations for Duoph Technologies — plan tasks, run client work, track cashflow, and see who’s delivering, in one workspace.",
  keywords: [
    "Duoph",
    "Duoph Technologies",
    "operations",
    "task management",
    "clients",
    "cashflow",
    "analytics",
    "internal workspace",
  ],
} as const;

export function siteUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://duoph-crm.vercel.app";
}
