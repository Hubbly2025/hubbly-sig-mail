import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/* ---------- Buttons ---------- */

const btnBase =
  "inline-flex items-center justify-center gap-2 min-h-10 px-4 rounded-control text-sm font-sans cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed no-underline";

export const btn = {
  primary: cx(btnBase, "bg-accent text-white font-semibold hover:bg-accent-hover hover:text-white"),
  secondary: cx(btnBase, "bg-surface text-ink border border-control hover:bg-head hover:text-ink"),
  dark: cx(btnBase, "bg-ink text-white font-semibold hover:bg-ink-2 hover:text-white"),
  ghost: cx(btnBase, "bg-transparent text-muted hover:text-ink"),
  small: "min-h-8 px-3 text-[13px] rounded-[9px]",
};

export function Button({
  variant = "secondary",
  small,
  className,
  ...rest
}: ComponentProps<"button"> & { variant?: keyof Omit<typeof btn, "small">; small?: boolean }) {
  return <button type="button" className={cx(btn[variant], small && btn.small, className)} {...rest} />;
}

export function ButtonLink({
  variant = "secondary",
  small,
  className,
  ...rest
}: ComponentProps<typeof Link> & { variant?: keyof Omit<typeof btn, "small">; small?: boolean }) {
  return <Link className={cx(btn[variant], small && btn.small, className)} {...rest} />;
}

/* ---------- Surfaces ---------- */

export function Card({ className, ...rest }: ComponentProps<"section">) {
  return <section className={cx("bg-surface border border-line rounded-card", className)} {...rest} />;
}

export function KpiTile({ label, value, sub, subTone }: { label: string; value: ReactNode; sub?: ReactNode; subTone?: "muted" | "success" | "warn" }) {
  return (
    <div className="bg-surface border border-line rounded-card px-[18px] py-4 flex flex-col gap-1.5">
      <div className="text-meta text-muted">{label}</div>
      <div className="text-[26px] font-semibold tabular tracking-[-0.01em] leading-tight">{value}</div>
      {sub && (
        <div className={cx("text-xs", subTone === "success" ? "text-success" : subTone === "warn" ? "text-warn" : "text-muted")}>{sub}</div>
      )}
    </div>
  );
}

/* ---------- Pills, tags, bars ---------- */

export type Tone = "success" | "warn" | "danger" | "neutral" | "accent";

const toneClass: Record<Tone, string> = {
  success: "bg-success-bg text-success",
  warn: "bg-warn-bg text-warn",
  danger: "bg-danger-bg text-danger",
  neutral: "bg-chip text-chip-ink",
  accent: "bg-[#e7edfa] text-accent-ink",
};

export function StatusPill({ tone, children, className }: { tone: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex items-center min-h-6 px-2.5 rounded-full text-[12.5px] font-medium whitespace-nowrap", toneClass[tone], className)}>
      {children}
    </span>
  );
}

export function SourceTag({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "accent" }) {
  return (
    <span
      className={cx(
        "shrink-0 px-[7px] py-px rounded-md text-[11.5px] font-medium",
        tone === "accent" ? "bg-accent-soft2 text-accent-ink font-semibold" : "bg-tag text-ink-2"
      )}
    >
      {children}
    </span>
  );
}

export function Bar({ pct, color, height = 6, className }: { pct: number; color?: string; height?: number; className?: string }) {
  return (
    <div className={cx("rounded-full bg-track overflow-hidden", className)} style={{ height }}>
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color ?? "var(--accent)" }} />
    </div>
  );
}

export function CountBadge({ children }: { children: ReactNode }) {
  return <span className="px-[7px] py-px rounded-full bg-accent text-white text-[11.5px] font-semibold">{children}</span>;
}

export function Avatar({ initials, tone = "accent", size = 30 }: { initials: string; tone?: "accent" | "success"; size?: number }) {
  return (
    <span
      className={cx(
        "shrink-0 rounded-full flex items-center justify-center font-semibold",
        tone === "success" ? "bg-success-bg text-success" : "bg-[#e3e7f1] text-accent-ink"
      )}
      style={{ width: size, height: size, fontSize: size > 36 ? 14 : 12 }}
    >
      {initials}
    </span>
  );
}

/* ---------- Formatting ---------- */

export const fmt = {
  n: (x: number) => x.toLocaleString("en-US"),
  pct: (x: number | null) => (x === null ? "—" : `${(x * 100).toFixed(1)}%`),
};
