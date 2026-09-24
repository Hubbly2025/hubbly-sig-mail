import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Overview | Hubbly Outreach", description: "Outreach activity, campaign performance, sending capacity, and items awaiting review." };
export default function Layout({ children }: { children: ReactNode }) { return children; }
