import { Builder } from "@/components/builder/Builder";
import { getCampaignDraft, getSendChecks, listPreviewContacts } from "@/lib/mail/api";

export default async function EditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [draft, contacts, checks] = await Promise.all([getCampaignDraft(id), listPreviewContacts(), getSendChecks()]);
  return <Builder draft={draft} contacts={contacts} checks={checks} />;
}
