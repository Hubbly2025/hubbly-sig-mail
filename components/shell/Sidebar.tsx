"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cx, Avatar, CountBadge } from "@/components/ui-hubbly";
import {
  IconChat,
  IconChevronDown,
  IconGrid,
  IconList,
  IconLock,
  IconMail,
  IconPerson,
  IconPlug,
  IconSend,
  IconSignal,
} from "@/components/ui-hubbly/icons";
import { brandInfo } from "@/lib/mail/brand";
import type { Workspace } from "@/lib/mail/types";

const itemClass = "flex items-center gap-2.5 min-h-9 px-2.5 rounded-lg no-underline text-ink-2 hover:bg-active hover:text-ink";

function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="px-2.5 pt-4 pb-1.5 text-[11.5px] font-semibold tracking-[0.06em] text-label">{children}</div>;
}

export function Sidebar({ workspace, repliesWaiting }: { workspace: Workspace; repliesWaiting: number }) {
  const pathname = usePathname();
  const brand = brandInfo[workspace.brand];
  const locked = !workspace.mailEnabled;

  const mailItems = [
    { href: "/campaigns", label: "Campaigns", icon: <IconSend />, match: (p: string) => p.startsWith("/campaigns") },
    { href: "/replies", label: "Replies", icon: <IconChat />, badge: repliesWaiting, match: (p: string) => p.startsWith("/replies") },
    { href: "/leads", label: "Lead lists", icon: <IconList />, match: (p: string) => p.startsWith("/leads") },
    { href: "/domains", label: "Domains & mailboxes", icon: <IconMail />, match: (p: string) => p.startsWith("/domains") },
  ];

  return (
    <nav aria-label={brand.name} className="w-[244px] shrink-0 h-screen box-border px-3 py-[18px] bg-sidebar border-r border-line flex flex-col gap-0.5">
      <div className="flex items-center gap-2.5 px-2.5 pt-1 pb-4">
        <div className="w-7 h-7 rounded-lg bg-accent text-white flex items-center justify-center">
          <IconSignal size={16} strokeWidth={2} />
        </div>
        <div className="font-semibold text-[15px]">{brand.name}</div>
      </div>

      <button
        type="button"
        className="flex items-center justify-between mb-3 min-h-11 px-3 border border-line rounded-control bg-surface text-ink text-left cursor-pointer"
      >
        <span className="flex flex-col">
          <span className="text-[13px] font-semibold">{workspace.name}</span>
          <span className="text-[11.5px] text-muted">{workspace.subLabel}</span>
        </span>
        <IconChevronDown size={14} />
      </button>

      <a href={brand.hostDashboard} className={itemClass}>
        <IconGrid />
        Dashboard
      </a>
      <a href={brand.hostLeads} className={itemClass}>
        <IconPerson />
        Identified visitors
      </a>

      <SectionLabel>MAIL</SectionLabel>
      {mailItems.map((it) => {
        const active = it.match(pathname);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={cx(itemClass, active && "bg-active text-ink font-semibold")}
          >
            {it.icon}
            <span className="flex-1">{it.label}</span>
            {locked ? <IconLock size={14} /> : it.badge ? <CountBadge>{it.badge}</CountBadge> : null}
          </Link>
        );
      })}

      <SectionLabel>SIGNAL</SectionLabel>
      <a href="/pixel" className={itemClass}>
        <IconSignal />
        Pixel &amp; setup
      </a>
      <a href="/integrations" className={itemClass}>
        <IconPlug />
        Integrations
      </a>

      <div className="mt-auto flex items-center gap-2.5 p-2.5 border-t border-line">
        <Avatar initials={workspace.user.initials} />
        <div className="flex flex-col">
          <span className="text-[13px] font-semibold">{workspace.user.name}</span>
          <span className="text-xs text-muted">Settings · Support</span>
        </div>
      </div>
    </nav>
  );
}
