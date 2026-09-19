"use client";

import { useId, useState } from "react";
import type { InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function PasswordInput({ id: idProp, className, autoComplete, ...props }: Props) {
  const genId = useId();
  const id = idProp ?? genId;
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        id={id}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        className={cn("pr-11", className)}
      />
      <button
        type="button"
        className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md px-2 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-slate-100 hover:text-[var(--color-text-primary)]"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}
