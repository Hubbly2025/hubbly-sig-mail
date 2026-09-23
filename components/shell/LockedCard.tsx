import { Card } from "@/components/ui-hubbly";
import { IconLock } from "@/components/ui-hubbly/icons";

export function LockedCard() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <Card className="max-w-md p-8 flex flex-col gap-4 items-start">
        <span className="w-10 h-10 rounded-control bg-accent-soft2 text-accent-ink flex items-center justify-center">
          <IconLock size={18} />
        </span>
        <h2 className="m-0 text-xl font-semibold">Email the visitors who left</h2>
        <p className="m-0 text-ink-2 leading-relaxed">
          Mail turns the people Signal identifies into conversations. Hubbly sets up your sending domains, warms them up and follows up for you.
        </p>
        <a href="/billing?add=mail" className="inline-flex items-center min-h-10 px-4 rounded-control bg-accent text-white font-semibold no-underline hover:bg-accent-hover hover:text-white">
          Add Mail to your plan
        </a>
      </Card>
    </div>
  );
}
