"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { AlertTriangle, Check, CheckCircle2, ChevronLeft, ChevronRight, Copy, Info, Loader2, RefreshCw, X, XCircle } from "lucide-react";
import { ApiError } from "@/lib/api";
import type { Pagination as PaginationData } from "@/lib/types";
import type { StatusMeta, Tone } from "@/lib/status";

import { cn } from "@/lib/cn";
export { cn };

// ---- Buttons ----------------------------------------------------------------------------------
type Variant = "primary" | "secondary" | "dark" | "ghost" | "danger" | "mint-outline";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-mint text-forest hover:bg-mint-hover border border-transparent",
  secondary: "bg-paper text-ink border border-line hover:border-forest/40 hover:bg-bubble",
  dark: "bg-forest text-white border border-transparent hover:bg-forest-2",
  ghost: "bg-transparent text-ink border border-transparent hover:bg-bubble",
  danger: "bg-paper text-red-ink border border-red-ink/30 hover:bg-red-tint",
  "mint-outline": "bg-transparent text-white border border-hair-dark hover:border-mint hover:text-mint",
};
const SIZES: Record<Size, string> = {
  sm: "h-9 px-3 text-sm gap-1.5",
  md: "h-11 px-4 text-[15px] gap-2",
  lg: "h-13 px-6 text-base gap-2",
};

export const buttonClass = (variant: Variant = "primary", size: Size = "md", className?: string) =>
  cn(
    "inline-flex items-center justify-center rounded-control font-semibold whitespace-nowrap transition-colors disabled:opacity-55 disabled:cursor-not-allowed",
    VARIANTS[variant],
    SIZES[size],
    className,
  );

interface ButtonProps extends ComponentProps<"button"> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({ variant = "primary", size = "md", loading, icon, className, children, disabled, type = "button", ...props }: ButtonProps) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}

interface ButtonLinkProps extends ComponentProps<typeof Link> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}
export function ButtonLink({ variant = "primary", size = "md", icon, className, children, ...props }: ButtonLinkProps) {
  return (
    <Link className={buttonClass(variant, size, className)} {...props}>
      {icon}
      {children}
    </Link>
  );
}

// ---- Surfaces ---------------------------------------------------------------------------------
export function Card({ className, children, ...props }: ComponentProps<"section">) {
  return (
    <section className={cn("rounded-card bg-paper border border-line/70 shadow-card", className)} {...props}>
      {children}
    </section>
  );
}

export function CardHeader({ title, description, action, className }: { title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6", className)}>
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, description, actions, back }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back ? (
          <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink">
            <ChevronLeft className="size-4" aria-hidden />
            {back.label}
          </Link>
        ) : null}
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-[15px] text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

// ---- Status pills -----------------------------------------------------------------------------
const TONES: Record<Tone, { pill: string; dot: string }> = {
  success: { pill: "bg-mint-tint text-forest", dot: "bg-success" },
  warning: { pill: "bg-amber-tint text-amber-ink", dot: "bg-amber-dot" },
  danger: { pill: "bg-red-tint text-red-ink", dot: "bg-red-dot" },
  info: { pill: "bg-sky-tint text-sky-ink", dot: "bg-sky-dot" },
  neutral: { pill: "bg-bubble text-muted", dot: "bg-subtle" },
  dark: { pill: "bg-forest text-mint", dot: "bg-mint" },
};

export function Pill({ tone = "neutral", children, className, pulse }: { tone?: Tone; children: ReactNode; className?: string; pulse?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap", TONES[tone].pill, className)}>
      <span className={cn("size-1.5 shrink-0 rounded-full", TONES[tone].dot, pulse && "animate-pulse")} aria-hidden />
      {children}
    </span>
  );
}

export function StatusPill({ meta, className }: { meta: StatusMeta; className?: string }) {
  return (
    <Pill tone={meta.tone} className={className} pulse={meta.tone === "info"}>
      {meta.label}
    </Pill>
  );
}

// ---- Forms ------------------------------------------------------------------------------------
export function Field({ label, hint, error, children, htmlFor, optional, className }: { label: ReactNode; hint?: ReactNode; error?: string | null; children: ReactNode; htmlFor: string; optional?: boolean; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-semibold text-ink">
        {label}
        {optional ? <span className="ml-1 font-normal text-muted">(optional)</span> : null}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-sm text-red-ink" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const control =
  "w-full rounded-control border border-line bg-paper px-3.5 text-[15px] text-ink placeholder:text-subtle transition-colors hover:border-forest/30 focus:border-forest focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-forest disabled:bg-bubble disabled:text-muted aria-[invalid=true]:border-red-ink";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, "h-11", className)} {...props} />;
}
export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(control, "h-11 appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9", className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23566A61' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }} {...props}>
      {children}
    </select>
  );
}
export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-24 py-2.5", className)} {...props} />;
}

export function Toggle({ checked, onChange, label, description, id, disabled }: { checked: boolean; onChange: (value: boolean) => void; label: string; description?: string; id: string; disabled?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={id} className="text-sm font-semibold text-ink">
          {label}
        </label>
        {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50", checked ? "bg-forest" : "bg-line")}
      >
        <span className={cn("absolute top-1 size-5 rounded-full bg-paper shadow transition-transform", checked ? "translate-x-6" : "translate-x-1")} />
      </button>
    </div>
  );
}

// ---- Feedback ---------------------------------------------------------------------------------
const NOTICE: Record<"info" | "warning" | "danger" | "success", { box: string; icon: ReactNode }> = {
  info: { box: "bg-sky-tint text-sky-ink", icon: <Info className="size-5 shrink-0" aria-hidden /> },
  warning: { box: "bg-amber-tint text-amber-ink", icon: <AlertTriangle className="size-5 shrink-0" aria-hidden /> },
  danger: { box: "bg-red-tint text-red-ink", icon: <XCircle className="size-5 shrink-0" aria-hidden /> },
  success: { box: "bg-mint-tint text-forest", icon: <CheckCircle2 className="size-5 shrink-0" aria-hidden /> },
};

export function Notice({ tone = "info", title, children, action, className }: { tone?: keyof typeof NOTICE; title?: ReactNode; children?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-start gap-3 rounded-2xl px-4 py-3.5", NOTICE[tone].box, className)} role={tone === "danger" ? "alert" : "status"}>
      {NOTICE[tone].icon}
      <div className="min-w-0 flex-1 text-sm leading-relaxed">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cn(title ? "mt-0.5" : null, "opacity-95")}>{children}</div> : null}
      </div>
      {action}
    </div>
  );
}

export function Spinner({ className, label = "Loading" }: { className?: string; label?: string }) {
  return (
    <span role="status" className="inline-flex items-center">
      <Loader2 className={cn("size-5 animate-spin text-muted", className)} aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-ivory-2", className)} aria-hidden />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-5 w-96 max-w-full" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

export function EmptyState({ icon, title, description, action, className }: { icon?: ReactNode; title: string; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-12 text-center", className)}>
      {icon ? <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-mint-tint text-forest">{icon}</div> : null}
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description ? <p className="mt-1.5 max-w-md text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  const message = error instanceof ApiError ? error.message : "Something went wrong while loading this page.";
  const requestId = error instanceof ApiError ? error.requestId : null;
  return (
    <div className={cn("flex flex-col items-center px-6 py-12 text-center", className)} role="alert">
      <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-red-tint text-red-ink">
        <AlertTriangle className="size-6" aria-hidden />
      </div>
      <h3 className="text-base font-semibold text-ink">{error instanceof ApiError && error.status === 404 ? "Not found" : "Couldn't load this"}</h3>
      <p className="mt-1.5 max-w-md text-sm text-muted">{message}</p>
      {requestId ? <p className="mt-1 font-mono text-xs text-subtle">Reference: {requestId}</p> : null}
      {onRetry ? (
        <Button variant="secondary" className="mt-5" onClick={onRetry} icon={<RefreshCw className="size-4" aria-hidden />}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

// ---- Copy -------------------------------------------------------------------------------------
export function CopyButton({ value, label = "Copy", copiedLabel = "Copied", className, variant = "secondary", size = "sm" }: { value: string; label?: string; copiedLabel?: string; className?: string; variant?: Variant; size?: Size }) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.show({ tone: "danger", title: "Couldn't copy", description: "Select the text and copy it manually." });
    }
  };
  return (
    <Button variant={variant} size={size} onClick={copy} className={className} icon={copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />} aria-live="polite">
      {copied ? copiedLabel : label}
    </Button>
  );
}

// ---- Pagination -------------------------------------------------------------------------------
export function Pagination({ pagination, onPage }: { pagination: PaginationData; onPage: (page: number) => void }) {
  if (pagination.totalPages <= 1) return null;
  return (
    <nav className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 text-sm text-muted" aria-label="Pagination">
      <span>
        Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
      </span>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" disabled={pagination.page <= 1} onClick={() => onPage(pagination.page - 1)} icon={<ChevronLeft className="size-4" aria-hidden />}>
          Previous
        </Button>
        <Button variant="secondary" size="sm" disabled={!pagination.hasNextPage} onClick={() => onPage(pagination.page + 1)}>
          Next
          <ChevronRight className="size-4" aria-hidden />
        </Button>
      </div>
    </nav>
  );
}

// ---- Dialog (native <dialog>: focus is trapped and Escape closes it) -------------------------
export function Dialog({ open, onClose, title, description, children, footer }: { open: boolean; onClose: () => void; title: string; description?: ReactNode; children?: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className="m-auto w-[calc(100%-32px)] max-w-md rounded-card border-0 bg-paper p-0 text-ink shadow-pop backdrop:bg-forest/50"
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          <button type="button" onClick={onClose} className="-m-1 rounded-lg p-1 text-muted hover:bg-bubble" aria-label="Close">
            <X className="size-5" aria-hidden />
          </button>
        </div>
        {description ? <div className="mt-2 text-sm text-muted">{description}</div> : null}
        {children ? <div className="mt-4">{children}</div> : null}
      </div>
      {footer ? <div className="flex flex-wrap justify-end gap-2 border-t border-line px-6 py-4">{footer}</div> : null}
    </dialog>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel, tone = "dark", loading }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; description: ReactNode; confirmLabel: string; tone?: "dark" | "danger"; loading?: boolean }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Keep as is
          </Button>
          <Button variant={tone === "danger" ? "danger" : "dark"} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}

// ---- Toasts -----------------------------------------------------------------------------------
interface ToastItem {
  id: number;
  tone: "success" | "danger" | "info";
  title: string;
  description?: string;
}
const ToastContext = createContext<{ show: (toast: Omit<ToastItem, "id">) => void }>({ show: () => undefined });
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const show = useCallback((toast: Omit<ToastItem, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current.slice(-2), { ...toast, id }]);
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 5000);
  }, []);
  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div key={toast.id} role="status" className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl bg-forest px-4 py-3 text-white shadow-pop">
            {toast.tone === "success" ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-mint" aria-hidden /> : toast.tone === "danger" ? <XCircle className="mt-0.5 size-5 shrink-0 text-red-dot" aria-hidden /> : <Info className="mt-0.5 size-5 shrink-0 text-on-dark" aria-hidden />}
            <div className="min-w-0 text-sm">
              <p className="font-semibold">{toast.title}</p>
              {toast.description ? <p className="mt-0.5 text-on-dark">{toast.description}</p> : null}
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ---- Small helpers ----------------------------------------------------------------------------
export function Row({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start justify-between gap-4 py-2.5 text-sm", className)}>
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 text-right font-medium text-ink break-words">{children}</dd>
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange, label, onDark }: { tabs: { value: T; label: string; count?: number }[]; value: T; onChange: (value: T) => void; label: string; onDark?: boolean }) {
  const active = onDark ? "bg-mint text-forest" : "bg-forest text-white";
  const idle = onDark ? "text-on-dark hover:bg-forest-2 hover:text-white" : "text-muted hover:bg-paper hover:text-ink";
  return (
    <div className="-mx-1 overflow-x-auto pb-1" role="tablist" aria-label={label}>
      <div className="flex min-w-max gap-1 px-1">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={tab.value === value}
            onClick={() => onChange(tab.value)}
            className={cn("rounded-full px-3.5 py-2 text-sm font-semibold transition-colors", tab.value === value ? active : idle)}
          >
            {tab.label}
            {tab.count !== undefined ? <span className="ml-1.5 opacity-70">{tab.count}</span> : null}
          </button>
        ))}
      </div>
    </div>
  );
}
