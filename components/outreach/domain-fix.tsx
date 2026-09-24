"use client";

import { useState } from "react";
import { Button } from "@/components/ui-hubbly";
import { Panel, useToast } from "./feedback";
import { api, ApiError, MOCK } from "@/lib/outreach/client";
import type { Domain } from "@/lib/outreach/types";

export function DomainFix({ domain, onChecked }: { domain: Domain; onChecked: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const fix = domain.fix;
  if (!fix) return null;
  async function check() {
    setBusy(true);
    try { await api("POST", `outreach/domains/${domain.id}/check`); await onChecked(); toast("success", "DNS records are passing."); }
    catch (error) { toast("error", error instanceof ApiError && error.status === 422 ? "Record not found yet. DNS changes can take up to an hour." : (error as Error).message); }
    finally { setBusy(false); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(fix!.value); toast("success", "DNS value copied."); }
    catch { toast("error", "Could not copy. Select and copy the value below."); }
  }
  return <Panel title={`${domain.name} — ${fix.record} missing`} className="!border-warn-line" bodyClassName="px-5 pb-5">
    <p className="text-ink-2 leading-relaxed mt-0 mb-4">Add this record in your domain’s DNS settings. DMARC tells receiving mail servers how to handle messages that fail authentication and helps protect your domain from spoofing.</p>
    <div className="overflow-x-auto border border-line rounded-control mb-4"><table className="w-full text-left text-sm"><thead className="bg-head text-muted"><tr>{["Type", "Host", "Value"].map((label) => <th key={label} className="px-4 py-3 font-medium">{label}</th>)}</tr></thead><tbody><tr><td className="p-4 font-mono">{fix.type}</td><td className="p-4 font-mono">{fix.host}</td><td className="p-4 font-mono break-all select-all">{fix.value}</td></tr></tbody></table></div>
    <div className="flex gap-2"><Button onClick={copy}>Copy value</Button><Button variant="primary" disabled={busy} onClick={check}>{busy ? "Checking…" : "Check again"}</Button></div>
    {MOCK && <p className="text-xs text-muted mt-3 mb-0">Sample check only — no live DNS lookup is performed.</p>}
  </Panel>;
}
