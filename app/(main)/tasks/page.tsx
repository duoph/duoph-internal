import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TaskView } from "@/components/tasks/task-view";
import { getCurrentUser, canManageTasks, roleForUser } from "@/lib/auth/authorization";
import { listAllUsers } from "@/lib/auth/users";
import { clientService } from "@/lib/api/clients";
import { taskService } from "@/lib/api/tasks";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tasks",
  description: "Create, assign, and track work. Due dates default to 24 hours so nothing sits undated.",
};

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    assignee?: string;
    due?: string;
    client?: string;
  }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?next=/tasks");
  const filters = await searchParams;
  const manageTasks = canManageTasks(user);

  const [tasks, rawUsers, clients] = await Promise.all([
    taskService.list({
      viewerId: user.id,
      canViewAll: manageTasks,
    }),
    listAllUsers(),
    clientService.list(),
  ]);

  const users = rawUsers
    .filter((member) => !member.disabled_at)
    .map((member) => {
      const id = member._id.toString();
      return {
        id,
        name: member.admin_name.trim() || member.email.split("@")[0] || "User",
        email: member.email,
        role: roleForUser(member),
        activeTasks: tasks.filter(
          (task) =>
            task.assignee_ids.includes(id) &&
            task.status !== "completed" &&
            task.status !== "cancelled",
        ).length,
      };
    });

  return (
    <TaskView
      tasks={tasks}
      users={users}
      clients={clients.map((client) => ({ id: client.id, client_name: client.client_name }))}
      canManage={manageTasks}
      currentUserId={user.id}
      filters={filters}
      today={new Date().toISOString().slice(0, 10)}
    />
  );
}

