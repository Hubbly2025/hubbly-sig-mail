import { PageHeader } from "@/components/shell/PageHeader";
import { DomainsView } from "@/components/domains/DomainsView";
import { AddDomainButtons } from "@/components/domains/AddDomainButtons";
import { getSummary, listDomains, listMailboxes } from "@/lib/mail/api";

export default async function DomainsPage() {
  const [summary, domains, mailboxes] = await Promise.all([getSummary(), listDomains(), listMailboxes()]);
  return (
    <>
      <PageHeader repliesWaiting={summary.repliesWaiting} actions={<AddDomainButtons />} />
      <DomainsView summary={summary} domains={domains} mailboxes={mailboxes} />
    </>
  );
}
