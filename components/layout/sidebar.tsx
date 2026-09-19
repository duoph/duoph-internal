"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import type { CurrentUser } from "@/lib/auth/authorization";

const primaryItems = [
  { href: "/dashboard", label: "Overview", icon: "⌂" },
  { href: "/tasks", label: "Tasks", icon: "✓" },
  { href: "/analytics", label: "Task analytics", icon: "↗" },
];

const businessItems = [
  { href: "/clients", label: "Clients", icon: "◫" },
  { href: "/work", label: "Work", icon: "◇" },
  { href: "/cashflow", label: "Cashflow", icon: "$", finance: true },
  { href: "/reports", label: "Reports", icon: "▥", finance: true },
];

export function Sidebar({
  user,
  mobileOpen,
  onClose,
}: {
  user: CurrentUser;
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const isAdmin = user.role === "admin";

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-950/35 backdrop-blur-sm lg:hidden"
          aria-label="Close navigation"
          onClick={onClose}
        />
      ) : null}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-[232px] shrink-0 flex-col border-r border-[var(--color-border-subtle)] bg-white text-[var(--color-text-primary)] shadow-xl shadow-emerald-950/5 transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:shadow-none",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
      )}>
      <div className="flex h-14 items-center justify-between border-b border-[var(--color-border-subtle)] px-5">
        <Link href="/dashboard" className="flex items-center" onClick={onClose}>
          <Image src="/duoph-logo.png" alt="Duoph" width={706} height={244} priority className="h-auto w-28" />
        </Link>
        <button type="button" className="text-xl text-slate-400 lg:hidden" onClick={onClose} aria-label="Close navigation">×</button>
      </div>
      <nav className="flex flex-1 flex-col overflow-y-auto px-3 py-4" aria-label="Main">
        <NavGroup label="Workspace" items={primaryItems} pathname={pathname} onNavigate={onClose} />
        <NavGroup
          label="Business"
          items={businessItems.filter((item) => !item.finance || user.role === "admin" || user.role === "manager")}
          pathname={pathname}
          onNavigate={onClose}
        />

        <div className="mt-3 border-t border-[var(--color-border-subtle)] pt-4">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Manage</p>
          <SidebarLink href="/settings" label="Settings" icon="⚙" pathname={pathname} onNavigate={onClose} />
          {isAdmin ? (
            <SidebarLink href="/admin" label="Admin" icon="◆" pathname={pathname} onNavigate={onClose} />
          ) : null}
        </div>

      </nav>
      <div className="border-t border-[var(--color-border-subtle)] p-3">
        <div className="mb-1 flex items-center gap-2 px-3 py-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[9px] font-bold text-[var(--color-primary)]">
            {user.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold">{user.name}</p>
            <p className="truncate text-[9px] capitalize text-[var(--color-text-muted)]">{user.role}</p>
          </div>
        </div>
        <form action={logoutAction}>
          <Button type="submit" variant="ghost" className="w-full justify-start px-3 text-slate-500 hover:bg-emerald-50 hover:text-[var(--color-primary)]">
            <span aria-hidden>↪</span> Log out
          </Button>
        </form>
      </div>
    </aside>
    </>
  );
}

function NavGroup({
  label,
  items,
  pathname,
  onNavigate,
}: {
  label: string;
  items: { href: string; label: string; icon: string }[];
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <div className="mb-4">
      <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <div className="space-y-1">
        {items.map((item) => (
          <SidebarLink key={item.href} {...item} pathname={pathname} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  );
}

function SidebarLink({
  href,
  label,
  icon,
  pathname,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: string;
  pathname: string;
  onNavigate: () => void;
}) {
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-[var(--color-primary)] text-white shadow-md shadow-emerald-900/15"
          : "text-slate-600 hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)]",
      )}
    >
      <span className="flex h-5 w-5 items-center justify-center text-sm" aria-hidden>{icon}</span>
      {label}
    </Link>
  );
}
