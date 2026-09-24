"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "@/components/ui-hubbly";
import { IconChat, IconGrid, IconLock, IconMail, IconPerson, IconSend, IconSignal, IconPlug, IconSearch } from "@/components/ui-hubbly/icons";
import styles from "./sidebar.module.css";
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
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const badge = useResource<InboxCount>(status?.enabled ? "outreach/inbox?count_only=true" : null, { every: 60_000 });
  const locked = status && !status.enabled;
  useEffect(() => {
    const on = () => badge.reload();
    window.addEventListener("outreach:inbox-changed", on);
    return () => window.removeEventListener("outreach:inbox-changed", on);
  }, [badge]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape" && document.activeElement === searchRef.current) {
        setQuery("");
        searchRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const groups = [
    { label: "Workspace", items: [
      { href: brand.hostDashboard, label: "Dashboard", icon: <IconGrid />, host: true },
      { href: brand.hostLeads, label: "Leads", icon: <IconPerson />, host: true },
    ] },
    { label: "Outreach", items: [
      { href: "/approvals", label: "Approval inbox", icon: <IconCheckInbox />, badge: badge.data?.count },
      { href: "/campaigns", label: "Campaigns", icon: <IconSend /> },
      { href: "/mailboxes", label: "Mailboxes", icon: <IconMail /> },
      { href: "/inbox", label: "Inbox", icon: <IconChat /> },
    ] },
    { label: "Signal", items: [
      { href: "/pixel", label: "Pixel & Setup", icon: <IconSignal />, host: true },
      { href: "/integrations", label: "Integrations", icon: <IconPlug />, host: true },
    ] },
    { label: "Settings", items: [
      { href: "/settings", label: "Outreach settings", icon: <IconGear /> },
    ] },
  ];
  const filtered = groups.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase())),
  }));

  return (
    <nav aria-label={brand.name} className={styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.brandIcon}><IconSignal size={17} /></span>
        <span className={styles.wordmark}>{BRAND === "signal" ? <>HUBBLY<span>SIGNAL</span></> : brand.name}</span>
      </div>
      <div className={styles.search}>
        <IconSearch size={16} />
        <input ref={searchRef} type="search" aria-label="Search navigation" placeholder="Search" value={query} onChange={(event) => setQuery(event.target.value)} />
        <kbd aria-hidden="true">⌘K</kbd>
      </div>
      <div className={styles.navigation}>
        {filtered.map((group) => group.items.length > 0 && (
          <div key={group.label} className={cx(styles.group, group.label === "Settings" && styles.settings)}>
            <div className={styles.groupLabel}>{group.label}</div>
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const content = <>{item.icon}<span className={styles.itemLabel}>{item.label}</span>{locked && group.label === "Outreach" ? <IconLock size={14} /> : "badge" in item && !!item.badge ? <span className={styles.badge}>{item.badge}</span> : null}</>;
              const className = cx(styles.item, active && styles.active);
              return "host" in item ? (
                <a key={item.href} href={item.href} className={className} aria-current={active ? "page" : undefined}>{content}</a>
              ) : (
                <Link key={item.href} href={item.href} className={className} aria-current={active ? "page" : undefined} onClick={() => setQuery("")}>{content}</Link>
              );
            })}
          </div>
        ))}
        {!filtered.some((group) => group.items.length) && <p role="status" className={styles.empty}>No matching pages.</p>}
      </div>
      {MOCK && <div className={styles.sample}>Sample data — not connected</div>}
      <div className={styles.profile}>
        <span className={styles.avatar} aria-hidden="true">{(status?.user_name ?? "…").split(" ").map((part) => part[0]).join("").slice(0, 2)}</span>
        <div className={styles.profileText}>
          <span>{status?.user_name ?? ""}</span>
          <span className={styles.workspace} title={status?.workspace_name}>{status?.workspace_name ?? ""}{status?.role ? ` · ${status.role}` : ""}</span>
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
        <div className="flex min-h-screen min-w-[1440px] bg-bg">
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
