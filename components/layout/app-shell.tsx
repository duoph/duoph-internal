"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { PageChromeProvider, titleForPath } from "@/components/layout/page-chrome";
import type { CurrentUser } from "@/lib/auth/authorization";
import { cn } from "@/lib/utils/cn";

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: CurrentUser;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [headerActions, setHeaderActions] = useState<ReactNode>(null);
  const pathname = usePathname();
  const lockPageScroll =
    pathname === "/clients" ||
    pathname.startsWith("/clients/") ||
    pathname === "/tasks" ||
    pathname.startsWith("/tasks/");

  return (
    <PageChromeProvider setActions={setHeaderActions}>
      <div className="flex h-screen overflow-hidden bg-[var(--color-bg-base)]">
        <Sidebar
          user={user}
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />
        <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--color-border-subtle)] bg-white px-4 md:px-6">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-border-default)] text-lg lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              ☰
            </button>
            <h1 className="truncate text-[15px] font-semibold tracking-tight text-[var(--color-text-primary)]">
              {titleForPath(pathname)}
            </h1>
            <div className="ml-auto flex min-w-0 items-center justify-end gap-2">{headerActions}</div>
            <div className="flex shrink-0 items-center gap-2.5 pl-2">
              <div className="hidden text-right sm:block">
                <p className="text-xs font-semibold text-[var(--color-text-primary)]">{user.name}</p>
                <p className="text-[11px] capitalize text-[var(--color-text-muted)]">{user.role}</p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[var(--color-primary-soft)] p-1.5">
                <Image src="/duoph-icon.png" alt="" width={170} height={224} className="h-full w-full object-contain" />
              </div>
            </div>
          </header>
          <main
            className={cn(
              "min-h-0 flex-1 p-5 md:p-6 lg:p-8",
              lockPageScroll ? "overflow-hidden" : "overflow-y-auto",
            )}
          >
            <div className={cn("mx-auto max-w-[1320px]", lockPageScroll && "h-full min-h-0")}>{children}</div>
          </main>
        </div>
      </div>
    </PageChromeProvider>
  );
}
