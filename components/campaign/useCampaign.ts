"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { api } from "@/lib/outreach/client";
import type { Campaign } from "@/lib/outreach/types";

export type SaveState = "idle" | "saving" | "saved" | "error";
type Payload = Record<string, any>;
function merge(a: Payload, b: Payload): Payload {
  const out = { ...a };
  for (const [key, value] of Object.entries(b)) out[key] = value && typeof value === "object" && !Array.isArray(value) ? merge(out[key] ?? {}, value) : value;
  return out;
}
export function useCampaign(id: string) {
  const resource = useSWR(`outreach/campaigns/${id}`, (path) => api<Campaign>("GET", path), { revalidateOnFocus: false });
  const [save, setSave] = useState<SaveState>("idle");
  const latest = useRef(resource.data);
  latest.current = resource.data;
  const pending = useRef<Payload>({});
  const inFlight = useRef<Promise<boolean> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const replace = useCallback((campaign: Campaign) => { latest.current = campaign; void resource.mutate(campaign, { revalidate: false }); }, [resource.mutate]);
  const flush = useCallback((): Promise<boolean> => {
    clearTimeout(timer.current);
    if (inFlight.current) return inFlight.current;
    const run = async () => {
      while (Object.keys(pending.current).length) {
        const body = pending.current;
        pending.current = {};
        setSave("saving");
        try {
          const campaign = await api<Campaign>("PATCH", `outreach/campaigns/${id}`, body);
          replace(merge(campaign, pending.current) as Campaign);
        } catch {
          pending.current = merge(body, pending.current);
          setSave("error");
          return false;
        }
      }
      setSave("saved");
      return true;
    };
    inFlight.current = run().finally(() => { inFlight.current = null; });
    return inFlight.current;
  }, [id, replace]);
  const patch = useCallback((body: Payload, apply: (campaign: Campaign) => Campaign) => {
    if (latest.current) replace(apply(latest.current));
    pending.current = merge(pending.current, body);
    setSave("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), 700);
  }, [flush, replace]);
  useEffect(() => () => { clearTimeout(timer.current); void flush(); }, [flush]);
  return { campaign: resource.data, error: resource.error as Error | undefined, reload: () => resource.mutate(), replace, patch, flush, save, setSave };
}
