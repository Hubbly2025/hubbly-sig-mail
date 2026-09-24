"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { Avatar, CountBadge, cx } from "@/components/ui-hubbly";
import { IconChat, IconChevronDown, IconGrid, IconLock, IconMail, IconPerson, IconSend, IconSignal, IconList } from "@/components/ui-hubbly/icons";
import { useResource } from "@/lib/outreach/hooks";
import { BRAND, brandInfo } from "@/lib/outreach/brand";
import { MOCK } from "@/lib/outreach/client";
import type { InboxCount, OutreachStatus, Permission } from "@/lib/outreach/types";
import { Skel, ToastProvider } from "./feedback";

/* ---------- outreach/status: what this role may do ---------- */

const StatusCtx = createContext<OutreachStatus | null>(null);

export function useCan(p: Permission) {
  const s = useContext(StatusCtx);
  return !!s?.can[p];
}
export function useStatus() {
  return useContext(StatusCtx);
}

/* ---------- Sidebar ---------- */

const itemClass = "flex items-center gap-2.5 min-h-9 px-2.5 rounded-lg no-underline text-ink-2 hover:bg-active hover:text-ink";

function IconGear() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </svg>
  );
}
function IconCheckInbox() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z" />
      <path d="m9 9 2 2 4-4" />
    </svg>
  );
}

function Sidebar({ status }: { status: OutreachStatus | undefined }) {
  const pathname = usePathname();
  const brand = brandInfo[BRAND];
  const badge = useResource<InboxCount>(status?.enabled ? "outreach/inbox?count_only=true" : null, { every: 60_000 });
  const locked = status && !status.enabled;
  useEffect(() => {
    const on = () => badge.reload();
    window.addEventListener("outreach:inbox-changed", on);
    return () => window.removeEventListener("outreach:inbox-changed", on);
  }, [badge]);

  const items = [
    { href: "/approvals", label: "Approval inbox", icon: <IconCheckInbox />, badge: badge.data?.count },
    { href: "/campaigns", label: "Campaigns", icon: <IconSend /> },
    { href: "/mailboxes", label: "Mailboxes", icon: <IconMail /> },
    { href: "/inbox", label: "Inbox", icon: <IconChat /> },
    { href: "/settings", label: "Outreach settings", icon: <IconGear /> },
  ];

  return (
    <nav aria-label={brand.name} className="w-[244px] shrink-0 h-screen box-border px-3 py-[18px] bg-sidebar border-r border-line flex flex-col gap-0.5">
      <div className="flex items-center gap-2.5 px-2.5 pt-1 pb-4">
        <div className="w-7 h-7 rounded-lg bg-accent text-white flex items-center justify-center">
          <IconSignal size={16} strokeWidth={2} />
        </div>
        <div className="font-semibold text-[15px]">{brand.name}</div>
      </div>

      <button type="button" className="flex items-center justify-between mb-3 min-h-11 px-3 border border-line rounded-control bg-surface text-ink text-left cursor-pointer">
        <span className="flex flex-col min-w-0">
          <span className="text-[13px] font-semibold truncate">{status?.workspace_name ?? "…"}</span>
          <span className="text-[11.5px] text-muted">{status?.role ?? ""}</span>
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

      <div className="px-2.5 pt-4 pb-1.5 text-[11.5px] font-semibold tracking-[0.06em] text-label">OUTREACH</div>
      {items.map((it) => {
        const active = pathname.startsWith(it.href);
        return (
          <Link key={it.href} href={it.href} aria-current={active ? "page" : undefined} className={cx(itemClass, active && "bg-active text-ink font-semibold")}>
            {it.icon}
            <span className="flex-1">{it.label}</span>
            {locked ? <IconLock size={14} /> : it.badge ? <CountBadge>{it.badge}</CountBadge> : null}
          </Link>
        );
      })}

      <div className="px-2.5 pt-4 pb-1.5 text-[11.5px] font-semibold tracking-[0.06em] text-label">SIGNAL</div>
      <a href="/pixel" className={itemClass}>
        <IconSignal />
        Pixel &amp; setup
      </a>
      <a href="/integrations" className={itemClass}>
        <IconList />
        Integrations
      </a>

      <div className="mt-auto flex flex-col gap-2">
        {MOCK && <div className="mx-2.5 px-2.5 py-1.5 rounded-md bg-warn-bg text-warn text-[11.5px] font-medium">Sample data — not connected</div>}
        <div className="flex items-center gap-2.5 p-2.5 border-t border-line">
          <Avatar initials={(status?.user_name ?? "…").split(" ").map((x) => x[0]).join("").slice(0, 2)} />
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold">{status?.user_name ?? ""}</span>
            <span className="text-xs text-muted">Settings · Support</span>
          </div>
        </div>
      </div>
    </nav>
  );
}

function LockedCard() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <section className="max-w-md bg-surface border border-line rounded-card p-8 flex flex-col gap-4 items-start">
        <span className="w-10 h-10 rounded-control bg-accent-soft2 text-accent-ink flex items-center justify-center">
          <IconLock size={18} />
        </span>
        <h2 className="m-0 text-xl font-semibold">Email the visitors who left</h2>
        <p className="m-0 text-ink-2 leading-relaxed">Outreach turns the people Signal identifies into conversations. Hubbly sets up your mailboxes, warms them up and follows up for you.</p>
        <a href="/billing?add=outreach" className="inline-flex items-center min-h-10 px-4 rounded-control bg-accent text-white font-semibold no-underline hover:bg-accent-hover hover:text-white">
          Add Outreach to your plan
        </a>
      </section>
    </div>
  );
}

export function OutreachShell({ children }: { children: ReactNode }) {
  const status = useResource<OutreachStatus>("outreach/status");
  return (
    <ToastProvider>
      <StatusCtx.Provider value={status.data ?? null}>
        <div className="flex min-h-screen bg-bg">
          <Sidebar status={status.data} />
          <main className="flex-1 min-w-0 flex flex-col h-screen overflow-y-auto">
            {status.loading ? (
              <div className="p-8 flex flex-col gap-4">
                <Skel className="h-7 w-48" />
                <Skel className="h-4 w-72" />
                <Skel className="h-64 w-full rounded-card" />
              </div>
            ) : status.error ? (
              <div role="alert" className="p-8 text-ink-2">
                Outreach didn&apos;t load. {status.error.message}{" "}
                <button type="button" className="underline bg-transparent border-0 cursor-pointer text-accent" onClick={status.reload}>
                  Try again
                </button>
              </div>
            ) : !status.data?.enabled ? (
              <LockedCard />
            ) : (
              children
            )}
          </main>
        </div>
      </StatusCtx.Provider>
    </ToastProvider>
  );
}

/* ---------- Page header: title, live context line, actions ---------- */

export function PageHeader({ title, context, actions }: { title: string; context?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex items-center gap-3 px-8 py-5 bg-surface border-b border-line">
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <h1 className="m-0 text-2xl font-semibold tracking-[-0.01em]">{title}</h1>
        {context && <div className="text-meta text-muted">{context}</div>}
      </div>
      {actions}
    </header>
  );
}
