"use client";

import { StatusPill, cx } from "@/components/ui-hubbly";
import { IconCheck } from "@/components/ui-hubbly/icons";
import { Panel } from "@/components/outreach/feedback";
import { DomainFix } from "@/components/outreach/domain-fix";
import { PageHeader } from "@/components/outreach/shell";
import { useResource } from "@/lib/outreach/hooks";
import type { Domain } from "@/lib/outreach/types";

function DnsChip({ name, passing }: { name: string; passing: boolean }) {
  return <StatusPill tone={passing ? "success" : "danger"}><span aria-hidden="true" className="mr-1">{passing ? <IconCheck size={12} /> : "×"}</span>{name}<span className="sr-only">{passing ? " passing" : " missing"}</span></StatusPill>;
}
export default function DomainsPage() {
  const domains = useResource<Domain[]>("outreach/domains");
  const needsFix = domains.data?.filter((d) => !d.spf || !d.dkim || !d.dmarc) ?? [];
  return <>
    <PageHeader title="Domains" context={domains.data ? `${domains.data.length} domains · ${needsFix.length} need a fix` : "DNS health and sending reputation"} />
    <div className="p-8 flex flex-col gap-6">
      <Panel title="Domain health" loading={domains.loading} error={domains.error} onRetry={domains.reload} empty={!domains.data?.length} emptyText="No domains connected yet.">
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-head text-xs text-muted"><tr>{["Domain", "Mailboxes", "Status", "SPF / DKIM / DMARC", "Reputation", "Daily limit"].map((label) => <th key={label} className="px-5 py-3 font-medium whitespace-nowrap">{label}</th>)}</tr></thead><tbody>{domains.data?.map((domain) => <tr key={domain.id} className={cx("border-t border-divider", (!domain.spf || !domain.dkim || !domain.dmarc) && "bg-warn-bg")}>
          <td className="p-5"><div className="font-mono font-medium">{domain.name}</div><div className="text-xs text-muted mt-1">{domain.origin === "own" ? "Your domain" : "Managed domain"}</div></td><td className="p-5 tabular">{domain.mailboxes}</td>
          <td className="p-5"><StatusPill tone={domain.status === "healthy" ? "success" : "warn"}>{domain.status === "healthy" ? "Healthy" : domain.status === "warming" ? "Warming" : "Needs fix"}</StatusPill>{domain.warmup_day !== null && <div className="text-xs text-muted mt-1 whitespace-nowrap">Day {domain.warmup_day} of 35</div>}</td>
          <td className="p-5"><div className="flex gap-1.5"><DnsChip name="SPF" passing={domain.spf} /><DnsChip name="DKIM" passing={domain.dkim} /><DnsChip name="DMARC" passing={domain.dmarc} /></div></td>
          <td className="p-5"><StatusPill tone={domain.reputation === "good" ? "success" : domain.reputation === "poor" ? "danger" : "neutral"}>{domain.reputation === "good" ? "Good" : domain.reputation === "poor" ? "Poor" : "Building"}</StatusPill></td>
          <td className="p-5 whitespace-nowrap"><span className="font-mono">{domain.daily_limit}/day</span>{domain.daily_limit_after_warmup && <div className="text-xs text-muted mt-1">{domain.daily_limit_after_warmup}/day after warmup</div>}</td>
        </tr>)}</tbody></table></div>
      </Panel>
      {needsFix.map((domain) => <DomainFix key={domain.id} domain={domain} onChecked={domains.reload} />)}
    </div>
  </>;
}
