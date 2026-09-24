"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "@/components/ui-hubbly";
import { IconChat, IconGrid, IconLock, IconMail, IconPerson, IconSend, IconSignal, IconPlug, IconSearch, IconList, IconGlobe, IconBarChart } from "@/components/ui-hubbly/icons";
import styles from "./sidebar.module.css";
import { useResource } from "@/lib/outreach/hooks";
import { BRAND, brandInfo } from "@/lib/outreach/brand";
import { navGroups, defaultSidebarGroups, isCurrentNavItem, type NavItem } from "@/lib/nav";
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

const navIcons = { grid: IconGrid, person: IconPerson, approvals: IconCheckInbox, send: IconSend, list: IconList, chat: IconChat, chart: IconBarChart, mail: IconMail, globe: IconGlobe, signal: IconSignal, plug: IconPlug, gear: IconGear };

function SidebarGroup({ label, open, active, badges, alwaysOpen, onToggle, children }: {
  label: string;
  open: boolean;
  active: boolean;
  badges?: ReactNode;
  alwaysOpen?: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const [height, setHeight] = useState<number>();
  const id = `sidebar-group-${label.toLowerCase()}`;

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => setHeight(list.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={cx(styles.group, label === "Settings" && styles.settings)}>
      <button type="button" id={`${id}-header`} className={styles.groupLabel} aria-expanded={open} aria-controls={id} aria-disabled={alwaysOpen || undefined} onClick={alwaysOpen ? undefined : onToggle}>
        <span>{label}</span>
        {!open && badges}
        {!open && active && <><span className={styles.currentDot} aria-hidden="true" /><span className="sr-only">Contains current page</span></>}
        <svg className={styles.chevron} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
      </button>
      <div className={styles.groupPanel} style={{ height: open ? height ?? "auto" : 0 }} inert={!open} aria-hidden={!open}>
        <ul ref={listRef} id={id} className={styles.groupList} aria-labelledby={`${id}-header`}>{children}</ul>
      </div>
    </div>
  );
}

function Sidebar({ status }: { status: OutreachStatus | undefined }) {
  const pathname = usePathname();
  const brand = brandInfo[BRAND];
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const badge = useResource<InboxCount>(status?.enabled ? "outreach/inbox?count_only=true" : null, { every: 60_000 });
  const domains = useResource<import("@/lib/outreach/types").Domain[]>(status?.enabled && status.can.manage_mailboxes ? "outreach/domains" : null, { every: 60_000, refetchOnFocus: true });
  const domainAttention = domains.data?.some((domain) => domain.status === "needs_fix" || !domain.spf || !domain.dkim || !domain.dmarc);
  const locked = status && !status.enabled;
  function itemBadge(item: NavItem) {
    if (item.attention && domainAttention) return <span className={styles.attentionDot} role="img" aria-label="Domains need attention" title="Domains need attention" />;
    const count = item.badge ? badge.data?.[item.badge] : undefined;
    return count ? <span className={styles.badge} aria-label={`${count} ${item.badge === "unread" ? "unread replies" : "pending approvals"}`}>{count}</span> : null;
  }
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

  const groups = navGroups.filter((group) => !group.permission || status?.can[group.permission]);
  const activeGroup = groups.find((group) => group.items.some((item) => isCurrentNavItem(item, pathname)))?.id;
  const [openGroups, setOpenGroups] = useState(() => ({ ...defaultSidebarGroups, ...(activeGroup ? { [activeGroup]: true } : {}) }));

  useEffect(() => {
    let next = { ...defaultSidebarGroups };
    try {
      const saved: unknown = JSON.parse(localStorage.getItem("sidebar-groups") ?? "null");
      if (saved && typeof saved === "object" && !Array.isArray(saved)) {
        for (const key of Object.keys(next)) {
          const value = (saved as Record<string, unknown>)[key];
          if (typeof value === "boolean") next[key] = value;
        }
      }
    } catch {
      next = { ...defaultSidebarGroups };
    }
    for (const group of navGroups) if (group.alwaysOpen) next[group.id] = true;
    if (activeGroup) next[activeGroup] = true;
    setOpenGroups(next);
  }, [pathname, activeGroup]);

  function toggleGroup(label: string, open: boolean) {
    const next = { ...openGroups, [label.toLowerCase()]: !open };
    setQuery("");
    setOpenGroups(next);
    try {
      localStorage.setItem("sidebar-groups", JSON.stringify(next));
    } catch {
      // Keep this session usable when storage is unavailable; loading uses defaults.
    }
  }

  const filtered = groups.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.href !== null && item.label.toLowerCase().includes(query.trim().toLowerCase())),
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
        {filtered.map((group) => {
          if (!group.items.length) return null;
          const open = !!group.alwaysOpen || openGroups[group.id] || !!query.trim();
          const groupLocked = locked && group.requiresOutreach;
          return (
            <SidebarGroup key={group.id} label={group.label} open={open} alwaysOpen={group.alwaysOpen}
              active={activeGroup === group.id}
              badges={!groupLocked && group.items.map((item) => <span key={item.label} className={styles.headerBadge}>{itemBadge(item)}</span>)}
              onToggle={() => toggleGroup(group.label, open)}>
              {group.items.map((item) => {
                if (item.href === null) return null;
                const active = isCurrentNavItem(item, pathname);
                const Icon = navIcons[item.icon];
                const content = <><Icon /><span className={styles.itemLabel}>{item.label}</span>{groupLocked ? <><IconLock size={14} /><span className="sr-only">Outreach not enabled</span></> : itemBadge(item)}</>;
                const className = cx(styles.item, active && styles.active);
                return <li key={item.href}>{"host" in item ? (
                  <a href={item.href} className={className} aria-current={active ? "page" : undefined}>{content}</a>
                ) : (
                  <Link href={item.href} className={className} aria-current={active ? "page" : undefined} onClick={() => setQuery("")}>{content}</Link>
                )}</li>;
              })}
            </SidebarGroup>
          );
        })}
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
  const pathname = usePathname();
  const fluidPage = ["/overview", "/lists", "/domains", "/pipeline", "/mailboxes", "/meetings"].includes(pathname);
  return (
    <ToastProvider>
      <StatusCtx.Provider value={status.data ?? null}>
        <div className={cx("flex min-h-screen bg-bg", !fluidPage && "min-w-[1440px]")}>
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
