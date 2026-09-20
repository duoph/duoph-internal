"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

const SetActionsContext = createContext<Dispatch<SetStateAction<ReactNode>>>(() => {});

export function PageChromeProvider({
  setActions,
  children,
}: {
  setActions: Dispatch<SetStateAction<ReactNode>>;
  children: ReactNode;
}) {
  return <SetActionsContext.Provider value={setActions}>{children}</SetActionsContext.Provider>;
}

export function PageHeaderActions({ children }: { children: ReactNode }) {
  const setActions = useContext(SetActionsContext);

  useLayoutEffect(() => {
    setActions(children);
    return () => setActions(null);
  }, [children, setActions]);

  return null;
}

export function titleForPath(pathname: string) {
  if (pathname.startsWith("/admin/users")) return "Users";
  if (pathname.startsWith("/admin/work-types")) return "Work types";
  if (pathname.startsWith("/admin")) return "Admin";
  if (pathname.startsWith("/cashflow")) return "Cashflow";
  if (pathname.startsWith("/clients")) return "Clients";
  if (pathname.startsWith("/reports")) return "Reports";
  if (pathname.startsWith("/settings")) return "Settings";
  if (pathname.startsWith("/tasks")) return "Tasks";
  if (pathname.startsWith("/work")) return "Work";
  return "Overview";
}
