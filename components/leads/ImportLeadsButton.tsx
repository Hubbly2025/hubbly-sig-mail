"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui-hubbly";

export function ImportLeadsButton() {
  const ref = useRef<HTMLDialogElement>(null);
  const [file, setFile] = useState<string | null>(null);
  return (
    <>
      <Button variant="primary" onClick={() => ref.current?.showModal()}>
        Import leads
      </Button>
      <dialog ref={ref} aria-labelledby="import-title" className="rounded-card border border-line p-0 w-[440px] backdrop:bg-black/30">
        <form method="dialog" className="p-6 flex flex-col gap-4">
          <h2 id="import-title" className="m-0 text-lg font-semibold">
            Import leads
          </h2>
          <p className="m-0 text-ink-2 text-[13.5px] leading-relaxed">
            Upload a CSV with at least an email column. Hubbly checks for duplicates and verifies every address before anything can be sent.
          </p>
          <label className="flex flex-col gap-1.5 text-meta text-muted">
            CSV file
            <input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0]?.name ?? null)} className="text-sm text-ink" />
          </label>
          {file && <div className="text-meta text-success">{file} ready to import</div>}
          <div className="flex justify-end gap-2">
            <Button type="submit" value="cancel">
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!file}>
              Import and verify
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
