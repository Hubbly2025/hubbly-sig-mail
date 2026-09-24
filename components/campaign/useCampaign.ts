"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/outreach/client";
import type { Campaign } from "@/lib/outreach/types";

export type SaveState = "idle" | "saving" | "saved" | "error";

/** Loads one campaign; exposes a debounced PATCH for autosave and a replace() for fresh server copies. */
export function useCampaign(id: string) {
  const [campaign, setCampaign] = useState<Campaign>();
  const [error, setError] = useState<ApiError | Error>();
  const [save, setSave] = useState<SaveState>("idle");
  const pending = useRef<Record<string, unknown>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const load = useCallback(async () => {
    try {
      setCampaign(await api<Campaign>("GET", `outreach/campaigns/${id}`));
      setError(undefined);
    } catch (e) {
      setError(e as Error);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const flush = useCallback(async () => {
    const body = pending.current;
    pending.current = {};
    if (!Object.keys(body).length) return;
    setSave("saving");
    try {
      const c = await api<Campaign>("PATCH", `outreach/campaigns/${id}`, body);
      setCampaign((prev) => (prev ? { ...c, steps: prev.steps.map((s) => c.steps.find((x) => x.n === s.n) ?? s) } : c));
      setSave("saved");
    } catch {
      setSave("error");
    }
  }, [id]);

  /** Optimistic local change + debounced PATCH (autosave). */
  const patch = useCallback(
    (body: Record<string, any>, apply: (c: Campaign) => Campaign) => {
      setCampaign((c) => (c ? apply(c) : c));
      for (const [k, v] of Object.entries(body)) {
        const prev = pending.current[k];
        pending.current[k] = prev && typeof prev === "object" && typeof v === "object" ? { ...(prev as object), ...v } : v;
      }
      setSave("saving");
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, 700);
    },
    [flush]
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  return { campaign, error, reload: load, replace: setCampaign, patch, flush, save, setSave };
}
