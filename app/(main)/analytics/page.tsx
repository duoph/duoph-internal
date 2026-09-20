import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Overview",
};

export default function AnalyticsPage() {
  redirect("/dashboard");
}
