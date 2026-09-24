"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, api } from "./client";

export interface Resource<T> {
  data: T | undefined;
  error: ApiError | Error | undefined;
  loading: boolean;
  reload: () => Promise<void>;
  setData: (fn: (prev: T | undefined) => T | undefined) => void;
}

/**
 * GET a resource. Optional polling interval; refetches when the tab regains focus
 * (the approval inbox and Inbox rely on that).
 */
export function useResource<T>(path: string | null, opts: { every?: number; refetchOnFocus?: boolean } = {}): Resource<T> {
  const [data, setDataState] = useState<T>();
  const [error, setError] = useState<ApiError | Error>();
  const [loading, setLoading] = useState(!!path);
  const pathRef = useRef(path);
  pathRef.current = path;

  const load = useCallback(async (quiet = false) => {
    const p = pathRef.current;
    if (!p) return;
    if (!quiet) setLoading(true);
    try {
      const d = await api<T>("GET", p);
      if (pathRef.current === p) {
        setDataState(d);
        setError(undefined);
      }
    } catch (e) {
      if (pathRef.current === p) setError(e as Error);
    } finally {
      if (pathRef.current === p) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!path) return;
    load();
  }, [path, load]);

  useEffect(() => {
    if (!path || !opts.every) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") load(true);
    }, opts.every);
    return () => clearInterval(t);
  }, [path, opts.every, load]);

  useEffect(() => {
    if (!path || !opts.refetchOnFocus) return;
    const on = () => document.visibilityState === "visible" && load(true);
    document.addEventListener("visibilitychange", on);
    window.addEventListener("focus", on);
    return () => {
      document.removeEventListener("visibilitychange", on);
      window.removeEventListener("focus", on);
    };
  }, [path, opts.refetchOnFocus, load]);

  return {
    data,
    error,
    loading: loading && data === undefined,
    reload: () => load(true),
    setData: (fn) => setDataState((prev) => fn(prev)),
  };
}

/** Debounced value — used for autosave and live lint. */
export function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
