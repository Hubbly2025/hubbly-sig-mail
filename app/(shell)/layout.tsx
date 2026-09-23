import { Sidebar } from "@/components/shell/Sidebar";
import { LockedCard } from "@/components/shell/LockedCard";
import { getSummary, getWorkspace } from "@/lib/mail/api";

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const [workspace, summary] = await Promise.all([getWorkspace(), getSummary()]);
  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar workspace={workspace} repliesWaiting={summary.repliesWaiting} />
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-y-auto">{workspace.mailEnabled ? children : <LockedCard />}</main>
    </div>
  );
}
