import { hostHref } from "./outreach/brand";
import type { Permission } from "./outreach/types";

export type NavIcon = "grid" | "person" | "approvals" | "send" | "list" | "chat" | "chart" | "mail" | "globe" | "signal" | "plug" | "gear";
export interface NavItem {
  label: string;
  href: string | null;
  icon: NavIcon;
  host?: boolean;
  aliases?: string[];
  badge?: "count" | "unread";
  attention?: "domains";
}
export interface NavGroup {
  id: string;
  label: string;
  alwaysOpen?: boolean;
  defaultOpen?: boolean;
  requiresOutreach?: boolean;
  permission?: Permission;
  items: NavItem[];
}
export const navGroups: NavGroup[] = [
  { id: "workspace", label: "Workspace", alwaysOpen: true, items: [
    { label: "Dashboard", href: hostHref("/dashboard"), icon: "grid", host: true },
    { label: "Leads", href: hostHref("/leads"), icon: "person", host: true },
  ] },
  { id: "outreach", label: "Outreach", defaultOpen: true, requiresOutreach: true, items: [
    { label: "Overview", href: "/", aliases: ["/overview"], icon: "grid" },
    { label: "Approval inbox", href: "/approvals", icon: "approvals", badge: "count" },
    { label: "Campaigns", href: "/campaigns", icon: "send" },
    { label: "Lead lists", href: "/lists", icon: "list" },
    { label: "Inbox", href: "/inbox", icon: "chat", badge: "unread" },
    { label: "Meetings", href: "/meetings", icon: "person" },
    { label: "Analytics", href: "/analytics", icon: "chart" },
  ] },
  { id: "sending", label: "Sending", requiresOutreach: true, permission: "manage_mailboxes", items: [
    { label: "Mailboxes", href: "/mailboxes", icon: "mail" },
    { label: "Domains", href: "/domains", icon: "globe", attention: "domains" },
  ] },
  { id: "signal", label: "Signal", items: [
    { label: "Pixel & Setup", href: hostHref("/pixel"), icon: "signal", host: true },
    { label: "Integrations", href: hostHref("/integrations"), icon: "plug", host: true },
  ] },
  { id: "settings", label: "Settings", items: [
    { label: "Team & workspaces", href: hostHref("/workspaces"), icon: "person", host: true },
    { label: "Account", href: hostHref("/account"), icon: "person", host: true },
    { label: "Outreach settings", href: "/settings", icon: "gear" },
    { label: "Getting started", href: hostHref("/getting-started"), icon: "list", host: true },
    { label: "Support", href: hostHref("/support"), icon: "chat", host: true },
  ] },
];
export const defaultSidebarGroups: Record<string, boolean> = Object.fromEntries(navGroups.map((group) => [group.id, !!(group.alwaysOpen || group.defaultOpen)]));
export function isCurrentNavItem(item: NavItem, pathname: string) {
  if (!item.href || item.host) return false;
  return [item.href, ...(item.aliases ?? [])].some((href) => pathname === href || (href !== "/" && pathname.startsWith(`${href}/`)));
}
