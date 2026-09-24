"use client";

// One place that talks to the backend. Endpoints are written exactly as the
// devs' interface reference lists them (outreach/…); the server scopes every
// call to the workspace — the page never sends a workspace id.

import { handleMock, MockError } from "./mock";

/** Where Signal serves the outreach endpoints. CONFIRM the prefix with the devs. */
const BASE = (process.env.NEXT_PUBLIC_OUTREACH_API_BASE ?? "/api").replace(/\/$/, "");
/** Sample-data mode is on unless explicitly turned off. */
export const MOCK = process.env.NEXT_PUBLIC_OUTREACH_MOCK !== "0";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T>(method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE", path: string, body?: unknown): Promise<T> {
  const p = path.startsWith("outreach/") ? path : `outreach/${path}`;
  if (MOCK) {
    try {
      return (await handleMock(method, p, body)) as T;
    } catch (e) {
      if (e instanceof MockError) throw new ApiError(e.status, e.message);
      throw e;
    }
  }
  const res = await fetch(`${BASE}/${p}`, {
    method,
    credentials: "include",
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let message = `Something went wrong (${res.status}).`;
    try {
      const j = await res.json();
      message = j.message ?? j.error ?? message;
    } catch {}
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
