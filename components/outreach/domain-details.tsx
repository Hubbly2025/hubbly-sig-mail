"use client";

import { Button, StatusPill } from "@/components/ui-hubbly";
import { Dialog, useToast } from "./feedback";
import { DomainFix } from "./domain-fix";
import { MOCK } from "@/lib/outreach/client";
import type { Domain } from "@/lib/outreach/types";

export function DomainDetails({ domain, onClose, onChecked }: { domain: Domain | null; onClose: () => void; onChecked: () => Promise<void> }) {
  const toast = useToast();
  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); toast("success", "DNS record copied."); }
    catch { toast("error", "Could not copy. Select and copy the record below."); }
  }
  return <Dialog open={!!domain} title={domain ? `${domain.name} · DNS records` : "DNS records"} onClose={onClose} width={760}>
    {domain && <div className="flex flex-col gap-4">
      <p className="m-0 text-sm text-muted">{domain.mailboxes} of 3 mailboxes · Added {domain.connected_at}. Add the records below at your DNS provider.</p>
      {MOCK && <p className="m-0 rounded-control bg-warn-bg border border-warn-line p-3 text-sm text-ink">Sample DNS records only. Do not publish these values; use the records from your sending provider.</p>}
      {(domain.records ?? (domain.fix ? [domain.fix] : [])).map((record) => <section key={`${record.record}-${record.host}`} className="border border-line rounded-control p-4 flex flex-col gap-3">
        <div className="flex items-center gap-3"><h3 className="m-0 text-sm font-semibold">{record.record}</h3><StatusPill tone={domain[record.record.toLowerCase() as "spf" | "dkim" | "dmarc"] ? "success" : "warn"}>{domain[record.record.toLowerCase() as "spf" | "dkim" | "dmarc"] ? "Verified" : "Missing"}</StatusPill><span className="ml-auto font-mono text-meta text-muted">{record.type}</span></div>
        <div className="flex items-center gap-3"><div className="flex-1 min-w-0"><div className="text-xs text-muted mb-1">Host</div><code className="break-all select-all">{record.host}</code></div><Button small onClick={() => copy(record.host)} aria-label={`Copy ${record.record} host`}>Copy host</Button></div>
        <div className="flex items-start gap-3"><div className="flex-1 min-w-0"><div className="text-xs text-muted mb-1">Value</div><code className="text-sm break-all select-all">{record.value}</code></div><Button small onClick={() => copy(record.value)} aria-label={`Copy ${record.record} value`}>Copy value</Button></div>
      </section>)}
      {!domain.records?.length && !domain.fix && <p className="m-0 text-muted">DNS records are not available yet. Check your sending provider for the values.</p>}
      {domain.fix && <DomainFix domain={domain} onChecked={onChecked} />}
    </div>}
  </Dialog>;
}
