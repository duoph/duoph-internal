import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/authorization";
import { profileService } from "@/lib/api/profile";
import { SettingsForm } from "@/components/settings/settings-form";
import { AdminCreateUser } from "@/components/settings/admin-create-user";

export const metadata: Metadata = {
  title: "Settings",
  description: "Your profile, password, and account preferences.",
};

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const profile = await profileService.get(user.id);
  const isAdmin = user.role === "admin";

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <p className="text-sm text-[var(--color-text-secondary)]">Profile preferences and workspace access.</p>
      <SettingsForm email={user.email ?? ""} initialName={profile?.admin_name ?? ""} />
      {isAdmin ? <AdminCreateUser /> : null}
    </div>
  );
}
