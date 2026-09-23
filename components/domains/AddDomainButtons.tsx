"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui-hubbly";

type Mode = "own" | "new";

export function AddDomainButtons() {
  const ref = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<Mode>("new");
  const [value, setValue] = useState("");

  const open = (m: Mode) => {
    setMode(m);
    setValue("");
    ref.current?.showModal();
  };

  return (
    <>
      <Button onClick={() => open("own")}>Use my own domain</Button>
      <Button variant="primary" onClick={() => open("new")}>
        Get a new domain
      </Button>
      <dialog ref={ref} aria-labelledby="domain-title" className="rounded-card border border-line p-0 w-[460px] backdrop:bg-black/30">
        <form method="dialog" className="p-6 flex flex-col gap-4">
          <h2 id="domain-title" className="m-0 text-lg font-semibold">
            {mode === "own" ? "Connect a domain you own" : "Get a new sending domain"}
          </h2>
          <p className="m-0 text-ink-2 text-[13.5px] leading-relaxed">
            {mode === "own"
              ? "Use a secondary domain, not the one your main website and inbox run on. Hubbly shows you the DNS records to add, then creates mailboxes and starts warm-up."
              : "Hubbly registers a domain close to your brand, sets up SPF, DKIM and DMARC, creates mailboxes and starts warm-up. Ready to send in about 21 days."}
          </p>
          <label className="flex flex-col gap-1.5 text-meta text-muted">
            {mode === "own" ? "Domain" : "Name it after"}
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={mode === "own" ? "tryyourbrand.com" : "your brand name"}
              className="min-h-10 px-3 rounded-control border border-control text-sm text-ink font-mono"
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="submit" value="cancel">
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!value.trim()}>
              {mode === "own" ? "Show DNS records" : "Find domains"}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
