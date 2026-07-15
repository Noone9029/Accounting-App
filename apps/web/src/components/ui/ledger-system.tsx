import type { ButtonHTMLAttributes, ComponentType, InputHTMLAttributes, LabelHTMLAttributes, ReactNode, SelectHTMLAttributes, SVGProps, TextareaHTMLAttributes } from "react";
import Link from "next/link";
import { AlertTriangle, CircleDashed, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export type LedgerButtonVariant = "primary" | "secondary" | "quiet" | "danger";
export type LedgerButtonSize = "sm" | "md";
export type LedgerStatusTone = "neutral" | "success" | "warning" | "danger" | "info" | "draft";
export type LedgerAlertTone = "info" | "warning" | "danger" | "success";

const buttonVariants: Record<LedgerButtonVariant, string> = {
  primary: "border-transparent bg-palm text-white hover:bg-palm-dark disabled:bg-slate-400",
  secondary: "border-line bg-white text-slate-700 hover:border-accent/40 hover:bg-blue-50/30 disabled:text-slate-400",
  quiet: "border-transparent bg-transparent text-slate-700 hover:bg-slate-100 disabled:text-slate-400",
  danger: "border-rose-200 bg-rose-50 text-rosewood hover:bg-rose-100 disabled:text-slate-400",
};

const buttonSizes: Record<LedgerButtonSize, string> = {
  sm: "min-h-8 px-2.5 py-1.5 text-xs",
  md: "min-h-10 px-3 py-2 text-sm",
};

const statusTones: Record<LedgerStatusTone, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-rose-200 bg-rose-50 text-rosewood",
  info: "border-blue-200 bg-blue-50 text-blue-700",
  draft: "border-slate-200 bg-white text-steel",
};

const alertTones: Record<LedgerAlertTone, string> = {
  info: "border-blue-200 bg-blue-50 text-blue-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-rose-200 bg-rose-50 text-rosewood",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
};

export function buttonClassName({
  variant = "secondary",
  size = "md",
  className,
}: {
  variant?: LedgerButtonVariant;
  size?: LedgerButtonSize;
  className?: string;
} = {}) {
  return cn(
    "ledger-focus inline-flex shrink-0 items-center justify-center gap-2 rounded-md border font-semibold transition-colors disabled:cursor-not-allowed",
    buttonVariants[variant],
    buttonSizes[size],
    className,
  );
}

export function LedgerButton({
  href,
  icon: Icon,
  children,
  variant = "secondary",
  size = "md",
  className,
  ...buttonProps
}: Readonly<
  {
    href?: string;
    icon?: IconComponent;
    children: ReactNode;
    variant?: LedgerButtonVariant;
    size?: LedgerButtonSize;
    className?: string;
  } & ButtonHTMLAttributes<HTMLButtonElement>
>) {
  const content = (
    <>
      {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
      <span>{children}</span>
    </>
  );
  const classes = buttonClassName({ variant, size, className });
  const linkAriaLabel = buttonProps["aria-label"];

  if (href) {
    return (
      <Link href={href} className={classes} aria-label={linkAriaLabel}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={classes} {...buttonProps}>
      {content}
    </button>
  );
}

export function LedgerPage({ children, className }: Readonly<{ children: ReactNode; className?: string }>) {
  return <section className={cn("space-y-6", className)}>{children}</section>;
}

export function LedgerPageBody({ children, className }: Readonly<{ children: ReactNode; className?: string }>) {
  return <div className={cn("space-y-5", className)}>{children}</div>;
}

export function LedgerPageHeader({
  eyebrow,
  title,
  description,
  badge,
  actions,
  inverse = false,
}: Readonly<{ eyebrow?: string; title: string; description?: ReactNode; badge?: ReactNode; actions?: ReactNode; inverse?: boolean }>) {
  return (
    <header className="flex min-w-0 flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        {eyebrow ? <div className={cn("mb-1 text-xs font-semibold uppercase tracking-wide", inverse ? "text-slate-300" : "text-steel")}>{eyebrow}</div> : null}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className={cn("text-2xl font-semibold tracking-normal", inverse ? "text-white" : "text-ink")}>{title}</h1>
          {badge}
        </div>
        {description ? <div className={cn("mt-1 max-w-3xl text-sm leading-6", inverse ? "text-slate-200" : "text-steel")}>{description}</div> : null}
      </div>
      {actions ? <div className="flex min-w-0 flex-wrap items-center gap-2 md:justify-end">{actions}</div> : null}
    </header>
  );
}

export function LedgerToolbar({
  title,
  description,
  actions,
  children,
  className,
}: Readonly<{ title?: string; description?: ReactNode; actions?: ReactNode; children?: ReactNode; className?: string }>) {
  return (
    <section className={cn("rounded-md border border-line bg-panel p-4 shadow-panel", className)}>
      {title || description || actions ? (
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            {title ? <h2 className="text-base font-semibold text-ink">{title}</h2> : null}
            {description ? <div className="mt-1 text-sm leading-6 text-steel">{description}</div> : null}
          </div>
          {actions ? <LedgerActionBar>{actions}</LedgerActionBar> : null}
        </div>
      ) : null}
      {children ? <div className={title || description || actions ? "mt-3" : ""}>{children}</div> : null}
    </section>
  );
}

export function LedgerPanel({ children, className }: Readonly<{ children: ReactNode; className?: string }>) {
  return <section className={cn("rounded-md border border-line bg-panel p-4 shadow-panel", className)}>{children}</section>;
}

export function LedgerSection({
  title,
  description,
  action,
  children,
  className,
}: Readonly<{ title: ReactNode; description?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }>) {
  return (
    <LedgerPanel className={className}>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          {description ? <div className="mt-1 text-sm leading-6 text-steel">{description}</div> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </LedgerPanel>
  );
}

export function LedgerStatCard({
  label,
  value,
  detail,
  icon: Icon,
  href,
}: Readonly<{ label: string; value: ReactNode; detail?: ReactNode; icon?: IconComponent; href?: string }>) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-steel">{label}</span>
        {Icon ? <Icon className="h-4 w-4 text-palm" aria-hidden="true" /> : null}
      </div>
      <div className="mt-2 text-lg font-semibold text-ink">{value}</div>
      {detail ? <div className="mt-1 text-xs leading-5 text-steel">{detail}</div> : null}
    </>
  );
  const className = "block rounded-md border border-line bg-panel p-4 shadow-panel";
  return href ? (
    <Link href={href} className={cn(className, "hover:border-palm/50")}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

export function LedgerMetricGrid({ children, className }: Readonly<{ children: ReactNode; className?: string }>) {
  return <div className={cn("grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4", className)}>{children}</div>;
}

export function LedgerStatusBadge({ tone = "neutral", children }: Readonly<{ tone?: LedgerStatusTone; children: ReactNode }>) {
  return <span className={cn("inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold", statusTones[tone])}>{children}</span>;
}

export function LedgerEmptyState({
  title,
  description,
  action,
  icon: Icon = CircleDashed,
}: Readonly<{ title: string; description?: ReactNode; action?: ReactNode; icon?: IconComponent }>) {
  return (
    <div role="status" className="rounded-md border border-dashed border-line bg-panel px-4 py-8 text-center">
      <Icon className="mx-auto h-5 w-5 text-steel" aria-hidden="true" />
      <h2 className="mt-2 text-sm font-semibold text-ink">{title}</h2>
      {description ? <div className="mx-auto mt-2 max-w-xl text-sm leading-6 text-steel">{description}</div> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function LedgerLoadingState({ title = "Loading", description }: Readonly<{ title?: string; description?: ReactNode }>) {
  return (
    <div role="status" aria-live="polite" className="rounded-md border border-line bg-panel p-4 shadow-panel">
      <div className="flex items-center gap-3">
        <Loader2 className="h-4 w-4 animate-spin text-palm" aria-hidden="true" />
        <div>
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {description ? <div className="mt-1 text-sm leading-6 text-steel">{description}</div> : null}
        </div>
      </div>
    </div>
  );
}

export function LedgerErrorState({ title = "Unable to load", description, action }: Readonly<{ title?: string; description?: ReactNode; action?: ReactNode }>) {
  return (
    <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-4 text-rosewood">
      <h2 className="text-sm font-semibold">{title}</h2>
      {description ? <div className="mt-1 text-sm leading-6">{description}</div> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function LedgerAlert({ tone = "info", title, children }: Readonly<{ tone?: LedgerAlertTone; title?: string; children: ReactNode }>) {
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("rounded-md border px-4 py-3 text-sm leading-6", alertTones[tone])}>
      <div className="flex gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
        <div>
          {title ? <div className="font-semibold text-ink">{title}</div> : null}
          <div>{children}</div>
        </div>
      </div>
    </div>
  );
}

export function LedgerTableShell({ children, minWidth = "960px", className }: Readonly<{ children: ReactNode; minWidth?: string; className?: string }>) {
  return (
    <div className={cn("overflow-x-auto rounded-md border border-line bg-panel shadow-panel", className)}>
      <div style={{ minWidth }}>{children}</div>
    </div>
  );
}

export function LedgerDataTable({
  children,
  minWidth = "960px",
  className,
}: Readonly<{ children: ReactNode; minWidth?: string; className?: string }>) {
  return (
    <LedgerTableShell minWidth={minWidth} className={className}>
      <table className="w-full text-left text-sm">{children}</table>
    </LedgerTableShell>
  );
}

export function LedgerActionBar({ children, className }: Readonly<{ children: ReactNode; className?: string }>) {
  return <div className={cn("flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center", className)}>{children}</div>;
}

export function LedgerSidePanel({ title, description, children, className }: Readonly<{ title: string; description?: ReactNode; children: ReactNode; className?: string }>) {
  return (
    <aside className={cn("rounded-md border border-line bg-panel p-4 shadow-panel", className)}>
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {description ? <div className="mt-1 text-sm leading-6 text-steel">{description}</div> : null}
      <div className="mt-4 space-y-3">{children}</div>
    </aside>
  );
}

export function LedgerFormSection({ title, description, children, className }: Readonly<{ title: string; description?: ReactNode; children: ReactNode; className?: string }>) {
  return (
    <fieldset className={cn("rounded-md border border-line bg-panel p-4 shadow-panel", className)}>
      <legend className="px-1 text-base font-semibold text-ink">{title}</legend>
      {description ? <p className="mt-1 text-sm leading-6 text-steel">{description}</p> : null}
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export function LedgerFieldRow({ children, className }: Readonly<{ children: ReactNode; className?: string }>) {
  return <div className={cn("grid grid-cols-1 gap-3 md:grid-cols-2", className)}>{children}</div>;
}

export function LedgerSkeleton({ label = "Loading", rows = 3 }: Readonly<{ label?: string; rows?: number }>) {
  return (
    <div aria-busy="true" aria-label={label} className="space-y-2">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-8 animate-pulse rounded-md bg-mist" />
      ))}
      <Loader2 className="sr-only" aria-hidden="true" />
    </div>
  );
}

export function LedgerMoney({ children }: Readonly<{ children: ReactNode }>) {
  return <span className="font-mono text-xs tabular-nums text-ink">{children}</span>;
}

export function LedgerDate({ children }: Readonly<{ children: ReactNode }>) {
  return <span className="font-mono text-xs tabular-nums text-steel">{children}</span>;
}

export function LedgerKbd({ children }: Readonly<{ children: ReactNode }>) {
  return <kbd className="rounded border border-line bg-mist px-1.5 py-0.5 font-mono text-[11px] text-ink">{children}</kbd>;
}

export function LedgerMetadataRow({ items }: Readonly<{ items: Array<{ label: string; value: ReactNode }> }>) {
  return (
    <dl className="grid gap-2 text-xs text-steel sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-md bg-mist px-3 py-2">
          <dt className="font-semibold uppercase tracking-wide">{item.label}</dt>
          <dd className="mt-1 text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function LedgerReviewPanel({ title, status, children }: Readonly<{ title: string; status?: ReactNode; children: ReactNode }>) {
  return (
    <LedgerSidePanel title={title}>
      {status ? <div>{status}</div> : null}
      {children}
    </LedgerSidePanel>
  );
}

export function LedgerWorkflowCard({
  title,
  description,
  href,
  status,
}: Readonly<{ title: string; description: ReactNode; href?: string; status?: ReactNode }>) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-ink">{title}</h3>
        {status}
      </div>
      <div className="mt-2 text-sm leading-6 text-steel">{description}</div>
    </>
  );
  const className = "block rounded-md border border-line bg-panel p-4 shadow-panel";
  return href ? (
    <Link href={href} className={cn(className, "hover:border-palm/50")}>
      {content}
    </Link>
  ) : (
    <article className={className}>{content}</article>
  );
}

export function LedgerSummaryBand({ children, tone = "neutral" }: Readonly<{ children: ReactNode; tone?: "neutral" | "info" | "warning" | "success" }>) {
  const classes = {
    neutral: "border-line bg-panel text-steel",
    info: "border-blue-200 bg-blue-50 text-blue-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  };
  return <div className={cn("rounded-md border px-4 py-3 text-sm leading-6", classes[tone])}>{children}</div>;
}

export function LedgerBreadcrumbs({ items }: Readonly<{ items: Array<{ label: string; href?: string }> }>) {
  return (
    <nav aria-label="Breadcrumb" className="text-xs text-steel">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-1">
            {index > 0 ? <span aria-hidden="true">/</span> : null}
            {item.href ? (
              <Link href={item.href} className="font-medium hover:text-palm">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="font-semibold text-ink">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function LedgerFilterBar({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">{children}</div>;
}

export function LedgerFieldLabel({ children, className, ...props }: Readonly<LabelHTMLAttributes<HTMLLabelElement>>) {
  return (
    <label className={cn("block text-sm", className)} {...props}>
      {children}
    </label>
  );
}

export function LedgerFieldText({ children }: Readonly<{ children: ReactNode }>) {
  return <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-steel">{children}</span>;
}

export function LedgerFieldHelp({ children }: Readonly<{ children: ReactNode }>) {
  return <span className="mt-1 block text-xs leading-5 text-steel">{children}</span>;
}

export function LedgerInput({ className, ...props }: Readonly<InputHTMLAttributes<HTMLInputElement>>) {
  return (
    <input
      className={cn(
        "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-slate-400 focus:border-palm focus:ring-2 focus:ring-palm/10 disabled:bg-slate-50 disabled:text-slate-400",
        className,
      )}
      {...props}
    />
  );
}

export function LedgerTextarea({ className, ...props }: Readonly<TextareaHTMLAttributes<HTMLTextAreaElement>>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-slate-400 focus:border-palm focus:ring-2 focus:ring-palm/10 disabled:bg-slate-50 disabled:text-slate-400",
        className,
      )}
      {...props}
    />
  );
}

export function LedgerSelect({ className, children, ...props }: Readonly<SelectHTMLAttributes<HTMLSelectElement>>) {
  return (
    <select
      className={cn(
        "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-palm focus:ring-2 focus:ring-palm/10 disabled:bg-slate-50 disabled:text-slate-400",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function LedgerSegmentedControl<TValue extends string>({
  label,
  value,
  options,
  onChange,
}: Readonly<{ label: string; value: TValue; options: readonly { value: TValue; label: string }[]; onChange: (value: TValue) => void }>) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-md border border-line bg-white p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "ledger-focus min-h-8 rounded px-3 py-1.5 text-xs font-semibold transition-colors",
            value === option.value ? "bg-blue-50 text-accent shadow-sm" : "text-slate-600 hover:bg-slate-50",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
