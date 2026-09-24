import Link from "next/link";
import { Avatar, SourceTag, fmt } from "@/components/ui-hubbly";
import type { Pipeline } from "@/lib/outreach/types";

const colors = ["var(--muted)", "var(--accent)", "#3F6FD8", "#D39A3A", "#2E8A5C"];
export function PipelineBoard({ stages }: { stages: Pipeline["stages"] }) {
  return <div className="overflow-x-auto pb-2"><div className="grid grid-cols-5 gap-3 min-w-[980px]">
    {stages.map((stage, index) => <section key={stage.key} aria-label={stage.name} className="bg-head rounded-card p-3 min-w-0 border border-line">
      <header className="flex items-center gap-2 mb-1"><span className="h-2 w-2 rounded-full shrink-0" style={{ background: colors[index % colors.length] }} /><h3 className="text-[13px] font-semibold flex-1 m-0">{stage.name}</h3><span className="text-xs text-muted tabular">{stage.count}</span></header>
      <p className="text-xs text-muted mt-0 mb-4">${fmt.n(stage.value_monthly)}/mo</p>
      <div className="flex flex-col gap-3">{stage.deals.map((deal) => <Link href="/approvals" key={deal.id} className="block p-3 bg-surface rounded-control border border-line no-underline text-ink hover:border-accent focus-visible:outline-accent">
        <div className="font-semibold text-sm mb-1">{deal.company}</div><div className="text-xs text-muted">{deal.person}</div>
        <div className="flex items-center justify-between gap-2 my-4"><span className="text-sm font-medium tabular">{deal.value_label}</span><span aria-label={`Owner ${deal.owner_initials === "VR" ? "Vince" : "Paul"}`}><Avatar initials={deal.owner_initials} size={26} /></span></div>
        <SourceTag>{deal.source === "reply" ? "Reply" : "Email"}</SourceTag><p className="border-t border-divider pt-3 mt-3 mb-0 text-xs text-muted leading-relaxed">{deal.next_step}</p>
      </Link>)}{!stage.deals.length && <p className="text-xs text-muted">No deals in this stage.</p>}</div>
    </section>)}
  </div></div>;
}
