"use client";

import { StatusPill } from "@/components/ui-hubbly";
import { verificationStyles } from "./list-verification";
import type { LeadSource, ListLead } from "@/lib/outreach/types";

export const leadSourceLabels: Record<LeadSource, string> = { identified: "Identified visitors", imported: "Imported", crm: "From CRM" };

export function ListLeads({ rows, selected, onSelect }: { rows: ListLead[]; selected?: Set<string>; onSelect?: (id: string) => void }) {
  return <div className="overflow-x-auto"><table className="w-full text-left text-sm">
    <thead className="bg-head text-muted text-xs"><tr>{onSelect && <th className="px-4 py-3"><span className="sr-only">Select</span></th>}{["Lead", "Email", "Source", "Verification"].map((heading) => <th key={heading} className="px-4 py-3 font-medium">{heading}</th>)}</tr></thead>
    <tbody>{rows.map((lead) => <tr key={lead.id} className="border-t border-divider">
      {onSelect && <td className="px-4 py-3"><input type="checkbox" aria-label={`Select ${lead.name}`} checked={selected?.has(lead.id) ?? false} onChange={() => onSelect(lead.id)} /></td>}
      <td className="px-4 py-3"><div className="font-medium whitespace-nowrap">{lead.name}</div><div className="text-xs text-muted mt-1">{lead.company ?? "—"}</div></td>
      <td className="px-4 py-3"><div className="font-mono text-xs">{lead.email}</div><div className="text-xs text-muted mt-1">{lead.email_type === "business" ? "Business" : "Personal"}</div></td>
      <td className="px-4 py-3 whitespace-nowrap"><StatusPill tone="neutral">{leadSourceLabels[lead.source ?? "imported"]}</StatusPill></td>
      <td className="px-4 py-3 whitespace-nowrap"><StatusPill tone={verificationStyles[lead.verification].tone}>{verificationStyles[lead.verification].label}</StatusPill></td>
    </tr>)}</tbody>
  </table></div>;
}
