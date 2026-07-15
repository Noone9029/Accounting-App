import type { ButtonHTMLAttributes, ComponentType, ReactNode, SVGProps } from "react";
import { AlertTriangle, CheckCircle2, CircleDashed, FileText, Loader2 } from "lucide-react";
import Link from "next/link";
import {
  LedgerButton,
  LedgerDataTable,
  LedgerFieldHelp,
  LedgerFieldLabel,
  LedgerFieldText,
  LedgerFilterBar,
  LedgerInput,
  LedgerMoney,
  LedgerSegmentedControl,
  LedgerSelect,
  LedgerTextarea,
  LedgerTableShell,
  LedgerToolbar,
  buttonClassName,
} from "@/components/ui/ledger-system";
import { cn } from "@/lib/utils";

export {
  LedgerButton,
  LedgerDataTable as DataTable,
  LedgerTableShell as DataTableShell,
  LedgerFieldHelp as FieldHelp,
  LedgerFieldLabel as FieldLabel,
  LedgerFieldText as FieldText,
  LedgerFilterBar as FilterBar,
  LedgerInput,
  LedgerSelect,
  LedgerTextarea,
  LedgerMoney as MoneyCell,
  LedgerSegmentedControl as SegmentedControl,
  LedgerToolbar as Toolbar,
  buttonClassName,
};

export const cx = cn;

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export type StatusTone = "neutral" | "success" | "warning" | "danger" | "info" | "draft";

export function LedgerIconButton({
  label,
  icon: Icon,
  className = "",
  ...props
}: Readonly<
  {
    label: string;
    icon: IconComponent;
  } & ButtonHTMLAttributes<HTMLButtonElement>
>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={buttonClassName({ variant: "secondary", size: "sm", className: `h-9 w-9 p-0 ${className}` })}
      {...props}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

export function TableHead({ children }: Readonly<{ children: ReactNode }>) {
  return <thead className="bg-mist text-left text-xs font-semibold uppercase tracking-wide text-steel">{children}</thead>;
}

export function ReviewRail({
  title,
  description,
  children,
}: Readonly<{ title?: string; description?: ReactNode; children: ReactNode }>) {
  return (
    <aside className="rounded-lg border border-line bg-panel p-4 shadow-panel">
      {title ? <h2 className="text-base font-semibold text-ink">{title}</h2> : null}
      {description ? <div className="mt-1 text-sm leading-6 text-steel">{description}</div> : null}
      <div className={title || description ? "mt-4 space-y-3" : "space-y-3"}>{children}</div>
    </aside>
  );
}

const statusToneClasses: Record<StatusTone, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-rose-200 bg-rose-50 text-rose-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
  draft: "border-slate-200 bg-white text-slate-600",
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  badge,
  inverse = false,
}: Readonly<{
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  badge?: ReactNode;
  inverse?: boolean;
}>) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        {eyebrow ? <div className={`mb-1 text-xs font-semibold uppercase tracking-wide ${inverse ? "text-slate-300" : "text-steel"}`}>{eyebrow}</div> : null}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className={`text-2xl font-semibold tracking-normal ${inverse ? "text-white" : "text-ink"}`}>{title}</h1>
          {badge}
        </div>
        {description ? <div className={`mt-1 max-w-3xl text-sm leading-6 ${inverse ? "text-slate-200" : "text-steel"}`}>{description}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function PanelSection({
  title,
  description,
  action,
  children,
  className = "",
}: Readonly<{ title?: string; description?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }>) {
  return (
    <section className={`rounded-lg border border-line bg-panel shadow-panel ${className}`}>
      {title || description || action ? (
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {title ? <h2 className="text-lg font-semibold text-ink">{title}</h2> : null}
            {description ? <div className="mt-1 text-sm leading-6 text-steel">{description}</div> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function KpiCard({
  icon: Icon,
  label,
  value,
  detail,
  href,
  tone = "neutral",
  iconNode,
}: Readonly<{ icon?: IconComponent; iconNode?: ReactNode; label: string; value: ReactNode; detail?: ReactNode; href?: string; tone?: StatusTone }>) {
  const renderedIcon = Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : iconNode;
  const content = (
    <div className={`group rounded-lg border border-line bg-panel p-4 shadow-panel transition hover:border-accent/40 hover:shadow-lift ${href ? "ledger-focus" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-steel">{label}</div>
          <div className="mt-2 truncate text-xl font-semibold text-ink ledger-money">{value}</div>
        </div>
        {renderedIcon ? (
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${statusToneClasses[tone]}`}>
            {renderedIcon}
          </span>
        ) : null}
      </div>
      {detail ? <div className="mt-3 text-sm leading-5 text-steel">{detail}</div> : null}
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

export function StatusBadge({ children, tone = "neutral" }: Readonly<{ children: ReactNode; tone?: StatusTone }>) {
  return <span className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold ${statusToneClasses[tone]}`}>{children}</span>;
}

export function MoneyAmount({ value, currency = "AED" }: Readonly<{ value: ReactNode; currency?: string }>) {
  return (
    <span className="ledger-money text-ink">
      {currency} {value}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = FileText,
}: Readonly<{ title: string; description: ReactNode; action?: ReactNode; icon?: IconComponent }>) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-white px-5 py-8 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-mist text-steel">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="mt-3 text-base font-semibold text-ink">{title}</h3>
      <div className="mx-auto mt-1 max-w-xl text-sm leading-6 text-steel">{description}</div>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

export function LoadingSkeleton({ rows = 3 }: Readonly<{ rows?: number }>) {
  return (
    <div className="space-y-3" aria-label="Loading">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-10 animate-pulse rounded-md bg-slate-100" />
      ))}
    </div>
  );
}

export function ComplianceReadinessPanel({
  title = "Accounting readiness",
  description = "Local readiness review only. No tax-authority submission or provider reporting is enabled.",
  status = "Controlled beta",
  checks,
}: Readonly<{ title?: string; description?: string; status?: string; checks: readonly { label: string; status: "pass" | "warning" | "pending"; detail: string }[] }>) {
  return (
    <PanelSection
      title={title}
      description={description}
      action={<StatusBadge tone="info">{status}</StatusBadge>}
    >
      <div className="space-y-3">
        {checks.map((check) => {
          const Icon = check.status === "pass" ? CheckCircle2 : check.status === "warning" ? AlertTriangle : CircleDashed;
          const color = check.status === "pass" ? "text-palm" : check.status === "warning" ? "text-amber-700" : "text-steel";
          return (
            <div key={check.label} className="flex gap-3 text-sm">
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} aria-hidden="true" />
              <div>
                <div className="font-medium text-ink">{check.label}</div>
                <div className="mt-0.5 text-xs leading-5 text-steel">{check.detail}</div>
              </div>
            </div>
          );
        })}
      </div>
    </PanelSection>
  );
}

export function ActionGrid({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{children}</div>;
}

export function ActionTile({
  href,
  icon: Icon,
  label,
  description,
}: Readonly<{ href: string; icon: IconComponent; label: string; description: string }>) {
  return (
    <Link href={href} className="ledger-focus flex min-h-24 gap-3 rounded-lg border border-line bg-white p-4 shadow-panel transition hover:border-accent/40 hover:bg-blue-50/30">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-50 text-accent">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-steel">{description}</span>
      </span>
    </Link>
  );
}

export function SpinnerLabel({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-steel">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      {children}
    </span>
  );
}
