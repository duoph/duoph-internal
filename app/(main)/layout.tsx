import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/authorization";
import { AppShell } from "@/components/layout/app-shell";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  return (
    <AppShell user={user}>
      {children}
    </AppShell>
  );
}
