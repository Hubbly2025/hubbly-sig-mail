export type Brand = "signal" | "clickrabbit";

// The host product this app is mounted inside, set per deployment.
export const BRAND: Brand = (process.env.NEXT_PUBLIC_MAIL_BRAND as Brand) || "signal";

export const brandInfo: Record<Brand, { name: string; hostDashboard: string; hostLeads: string }> = {
  signal: { name: "Hubbly Signal", hostDashboard: "/dashboard", hostLeads: "/leads" },
  clickrabbit: { name: "ClickRabbit", hostDashboard: "/dashboard", hostLeads: "/leads" },
};
