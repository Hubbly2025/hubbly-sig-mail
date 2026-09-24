import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Pipeline | Hubbly Outreach", description: "A read-only view of meeting goals, pipeline stages, and next steps." };
export default function Layout({ children }: { children: ReactNode }) { return children; }
