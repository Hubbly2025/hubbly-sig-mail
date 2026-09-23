"use client";

import type { ReactNode } from "react";
import { cx } from "./index";

/* ---------- Controls ---------- */

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cx("flex p-[3px] rounded-control bg-track", className)}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={cx(
              "flex-1 min-h-[30px] px-3 rounded-lg border-0 text-[13px] cursor-pointer whitespace-nowrap",
              on ? "bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.08)] font-semibold text-ink" : "bg-transparent text-muted"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function FilterPill({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        "min-h-8 px-3 rounded-full border text-[13px] cursor-pointer whitespace-nowrap",
        active ? "bg-ink border-ink text-white" : "bg-surface border-control text-ink-2 hover:border-muted"
      )}
    >
      {children}
    </button>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  locked,
}: {
  checked: boolean;
  onChange?: (v: boolean) => void;
  label: string;
  locked?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={locked}
      onClick={() => onChange?.(!checked)}
      className={cx(
        "shrink-0 w-10 h-6 p-0.5 rounded-full border-0 flex cursor-pointer disabled:cursor-not-allowed",
        checked ? "justify-end" : "justify-start",
        checked ? (locked ? "bg-[#8fa6dc]" : "bg-accent") : "bg-[#cfcfc9]"
      )}
    >
      <span className="w-5 h-5 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)]" />
    </button>
  );
}

