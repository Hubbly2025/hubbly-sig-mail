import { Builder } from "@/components/builder/Builder";
import {
  getCampaignDraft,
  getSendChecks,
  getSettings,
  getVerificationSummary,
  listDomains,
  listLeadLists,
  listMailboxes,
  listPreviewContacts,
} from "@/lib/mail/api";
import type { VerificationSummary } from "@/lib/mail/types";

export default async function EditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [draft, contacts, checks, leadLists, mailboxes, domains, settings] = await Promise.all([
    getCampaignDraft(id),
    listPreviewContacts(),
    getSendChecks(),
    listLeadLists(),
    listMailboxes(),
    listDomains(),
    getSettings(),
  ]);

  const verificationEntries = await Promise.all(
    leadLists.map(async (l) => [l.id, await getVerificationSummary(l.id)] as const)
  );
  const verifications: Record<string, VerificationSummary> = Object.fromEntries(verificationEntries);

  return (
    <Builder
      draft={draft}
      contacts={contacts}
      checks={checks}
      leadLists={leadLists}
      verifications={verifications}
      mailboxes={mailboxes}
      domains={domains}
      settings={settings}
    />
  );
}
