import { PageHeader } from "@/components/shell/PageHeader";
import { LeadsView } from "@/components/leads/LeadsView";
import { getSummary, getVerificationSummary, listLeadLists, listLeads } from "@/lib/mail/api";
import { BRAND, brandInfo } from "@/lib/mail/brand";
import { btn } from "@/components/ui-hubbly";
import { ImportLeadsButton } from "@/components/leads/ImportLeadsButton";

export default async function LeadsPage() {
  const [summary, lists] = await Promise.all([getSummary(), listLeadLists()]);
  const verifications = Object.fromEntries(await Promise.all(lists.map(async (l) => [l.id, await getVerificationSummary(l.id)] as const)));
  const leads = await listLeads(lists[0].id);

  return (
    <>
      <PageHeader
        repliesWaiting={summary.repliesWaiting}
        actions={
          <>
            <a href={brandInfo[BRAND].hostLeads} className={btn.secondary}>
              Find leads in {brandInfo[BRAND].name}
            </a>
            <ImportLeadsButton />
          </>
        }
      />
      <LeadsView lists={lists} verifications={verifications} leads={leads} />
    </>
  );
}
