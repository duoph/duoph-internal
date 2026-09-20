import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-72" />
      <Skeleton className="h-20 w-full rounded-[var(--radius-card)]" />
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Skeleton className="h-80 rounded-[var(--radius-card)]" />
        <Skeleton className="h-80 rounded-[var(--radius-card)]" />
      </div>
      <Skeleton className="h-48 w-full rounded-[var(--radius-card)]" />
    </div>
  );
}
