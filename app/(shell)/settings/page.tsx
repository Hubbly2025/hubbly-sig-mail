import { PageHeader } from "@/components/shell/PageHeader";
import { SettingsView } from "@/components/settings/SettingsView";
import { getSettings, getSummary } from "@/lib/mail/api";

export default async function SettingsPage() {
  const [summary, settings] = await Promise.all([getSummary(), getSettings()]);
  return (
    <>
      <PageHeader repliesWaiting={summary.repliesWaiting} />
      <SettingsView initial={settings} />
    </>
  );
}
