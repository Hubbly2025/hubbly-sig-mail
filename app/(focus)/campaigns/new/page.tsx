import { Builder } from "@/components/builder/Builder";
import { getCampaignDraft, getSendChecks, listPreviewContacts } from "@/lib/mail/api";

export default async function NewCampaignPage() {
  const [draft, contacts, checks] = await Promise.all([getCampaignDraft(), listPreviewContacts(), getSendChecks()]);
  return <Builder draft={draft} contacts={contacts} checks={checks} />;
}
