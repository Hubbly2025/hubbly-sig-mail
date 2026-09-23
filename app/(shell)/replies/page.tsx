import { PageHeader } from "@/components/shell/PageHeader";
import { RepliesView } from "@/components/replies/RepliesView";
import { ButtonLink } from "@/components/ui-hubbly";
import { IconPlus } from "@/components/ui-hubbly/icons";
import { getSummary, listReplies } from "@/lib/mail/api";

export default async function RepliesPage() {
  const [summary, replies] = await Promise.all([getSummary(), listReplies()]);
  return (
    <>
      <PageHeader
        repliesWaiting={summary.repliesWaiting}
        actions={
          <ButtonLink href="/campaigns/new" variant="primary">
            <IconPlus size={15} />
            New campaign
          </ButtonLink>
        }
      />
      <RepliesView replies={replies} currentUser="Vince" />
    </>
  );
}
