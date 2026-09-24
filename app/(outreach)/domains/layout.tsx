import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Domains | Hubbly Outreach", description: "Review domain DNS health, reputation, warmup, and daily sending limits." };
export default function Layout({ children }: { children: ReactNode }) { return children; }
