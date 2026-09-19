import { getCurrentUser } from "@/lib/auth/authorization";
import { profileService } from "@/lib/api/profile";
import { SettingsForm } from "@/components/settings/settings-form";
import { AdminCreateUser } from "@/components/settings/admin-create-user";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const profile = await profileService.get(user.id);
  const isAdmin = user.role === "admin";

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <p className="eyebrow">Your account</p>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Profile preferences and workspace access.</p>
      </div>
      <SettingsForm email={user.email ?? ""} initialName={profile?.admin_name ?? ""} />
      {isAdmin ? <AdminCreateUser /> : null}
    </div>
  );
}
