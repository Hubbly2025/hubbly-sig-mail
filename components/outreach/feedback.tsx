"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Button, cx } from "@/components/ui-hubbly";

/* ---------- Toasts: green done, red failed, amber done-but-read-this ---------- */

type ToastTone = "success" | "error" | "warn";
interface ToastItem {
  id: number;
  tone: ToastTone;
  text: string;
}

const ToastCtx = createContext<(tone: ToastTone, text: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((tone: ToastTone, text: string) => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, tone, text }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), tone === "success" ? 3500 : 6500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div aria-live="polite" className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-[360px] pointer-events-none">
        {items.map((t) => (
          <div
            key={t.id}
            role={t.tone === "error" ? "alert" : "status"}
            className={cx(
              "pointer-events-auto px-4 py-3 rounded-control border text-[13.5px] shadow-[0_6px_24px_rgba(0,0,0,0.08)] flex gap-2.5 items-start",
              t.tone === "success" && "bg-success-bg border-[#bfdccb] text-success",
              t.tone === "error" && "bg-danger-bg border-[#efc2bc] text-danger",
              t.tone === "warn" && "bg-warn-bg border-warn-line text-warn"
            )}
          >
            <span aria-hidden className="mt-1.5 w-2 h-2 rounded-full shrink-0 bg-current" />
            <span className="flex-1">{t.text}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- Skeletons ---------- */

export function Skel({ className }: { className?: string }) {
  return <div aria-hidden className={cx("rounded-md bg-[#ecece8] animate-pulse", className)} />;
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col" aria-label="Loading" role="status">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4 border-t border-divider first:border-t-0">
          <div className="flex-1 flex flex-col gap-2">
            <Skel className="h-3.5 w-2/5" />
            <Skel className="h-3 w-3/5" />
          </div>
          <Skel className="h-6 w-20 rounded-full" />
          <Skel className="h-3.5 w-12" />
        </div>
      ))}
    </div>
  );
}

/* ---------- Panel: content, loading, empty, or error — never nothing ---------- */

export function Panel({
  title,
  actions,
  loading,
  error,
  empty,
  emptyText,
  emptyAction,
  onRetry,
  skeleton,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  actions?: ReactNode;
  loading?: boolean;
  error?: Error;
  empty?: boolean;
  emptyText?: ReactNode;
  emptyAction?: ReactNode;
  onRetry?: () => void;
  skeleton?: ReactNode;
  children?: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section aria-label={title} className={cx("bg-surface border border-line rounded-card flex flex-col min-h-0", className)}>
      {(title || actions) && (
        <div className="flex items-center gap-3 px-5 pt-3.5 pb-3">
          {title && <h2 className="m-0 text-[11.5px] font-semibold tracking-[0.07em] uppercase text-label flex-1">{title}</h2>}
          {actions}
        </div>
      )}
      <div className={cx("flex-1 min-h-0", bodyClassName)}>
        {loading ? (
          skeleton ?? <SkeletonRows />
        ) : error ? (
          <div role="alert" className="px-5 py-10 flex flex-col items-center gap-3 text-center">
            <p className="m-0 text-ink-2">{error.message || "This didn't load."}</p>
            {onRetry && <Button onClick={onRetry}>Try again</Button>}
          </div>
        ) : empty ? (
          <div className="px-5 py-10 flex flex-col items-center gap-3 text-center text-muted">
            <div>{emptyText ?? "Nothing here yet."}</div>
            {emptyAction}
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

/* ---------- Dialog ---------- */

export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  width = 520,
  labelId,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
  labelId?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = labelId ?? `dlg-${title.replace(/\W+/g, "-").toLowerCase()}`;
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      onClose={onClose}
      onCancel={onClose}
      className="rounded-card border border-line p-0 backdrop:bg-black/30 max-h-[88vh]"
      style={{ width }}
    >
      {open && (
        <div className="flex flex-col max-h-[88vh]">
          <div className="flex items-start gap-3 px-6 pt-5 pb-3">
            <h2 id={id} className="m-0 text-lg font-semibold flex-1">
              {title}
            </h2>
            <button type="button" aria-label="Close" onClick={onClose} className="w-8 h-8 -mr-2 rounded-lg border-0 bg-transparent text-muted text-xl leading-none cursor-pointer hover:bg-active">
              ×
            </button>
          </div>
          <div className="px-6 pb-4 overflow-y-auto">{children}</div>
          {footer && <div className="px-6 py-4 border-t border-divider flex justify-end gap-2">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

/** The "?" next to a page's main action. */
export function HelpButton({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label={`What is this? ${title}`}
        onClick={() => setOpen(true)}
        className="w-10 h-10 rounded-control border border-control bg-surface text-ink-2 font-semibold cursor-pointer hover:bg-head"
      >
        ?
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={title} width={560} footer={<Button onClick={() => setOpen(false)}>Got it</Button>}>
        <div className="flex flex-col gap-3 text-[14px] leading-relaxed text-ink-2">{children}</div>
      </Dialog>
    </>
  );
}

export function Pager({ page, total, size, onPage }: { page: number; total: number; size: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / size));
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pages" className="flex items-center justify-between px-5 py-3 border-t border-divider text-meta text-muted">
      <span>
        {(page - 1) * size + 1}–{Math.min(total, page * size)} of {total.toLocaleString("en-US")}
      </span>
      <span className="flex gap-2">
        <Button small disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <Button small disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </span>
    </nav>
  );
}
