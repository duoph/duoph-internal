"use client";

import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        richColors
        position="top-center"
        theme="light"
        visibleToasts={3}
        offset={72}
        toastOptions={{
          duration: 2500,
        }}
      />
    </>
  );
}
