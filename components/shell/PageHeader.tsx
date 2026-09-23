"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cx, CountBadge } from "@/components/ui-hubbly";

const tabs = [
  { href: "/campaigns", label: "Campaigns" },
  { href: "/leads", label: "Leads" },
  { href: "/replies", label: "Replies", badgeKey: "replies" as const },
  { href: "/domains", label: "Domains & mailboxes" },
  { href: "/settings", label: "Settings" },
];

export function PageHeader({ actions, repliesWaiting }: { actions?: ReactNode; repliesWaiting?: number }) {
  const pathname = usePathname();
  return (
    <header className="flex flex-col gap-3.5 px-8 pt-[22px] bg-surface border-b border-line">
      <div className="flex items-center gap-3">
        <div className="flex flex-col gap-0.5 flex-1">
          <div className="text-meta text-muted">Send</div>
          <h1 className="m-0 text-2xl font-semibold tracking-[-0.01em]">Mail</h1>
        </div>
        {actions}
      </div>
      <nav aria-label="Mail sections" className="flex gap-7">
        {tabs.map((t) => {
          const active = pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={cx(
                "flex items-center gap-2 pt-2 pb-3 border-b-2 no-underline",
                active ? "border-ink text-ink font-semibold hover:text-ink" : "border-transparent text-muted hover:text-ink"
              )}
            >
              {t.label}
              {t.badgeKey === "replies" && repliesWaiting ? <CountBadge>{repliesWaiting}</CountBadge> : null}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
