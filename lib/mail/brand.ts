import type { Brand } from "./types";

// The host product this app is mounted inside. Set per deployment/zone;
// later resolved from the request host (app.hubblysignal.io vs ClickRabbit).
export const BRAND: Brand = (process.env.NEXT_PUBLIC_MAIL_BRAND as Brand) || "signal";

export const brandInfo: Record<Brand, { name: string; hostDashboard: string; hostLeads: string }> = {
  signal: { name: "Hubbly Signal", hostDashboard: "/dashboard", hostLeads: "/leads" },
  clickrabbit: { name: "ClickRabbit", hostDashboard: "/dashboard", hostLeads: "/leads" },
};
