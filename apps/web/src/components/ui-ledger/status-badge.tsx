import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  children: React.ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "info" | "muted";
  className?: string;
}

const toneClassName: Record<NonNullable<StatusBadgeProps["tone"]>, string> = {
  default: "",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-rose-200 bg-rose-50 text-rosewood",
  info: "border-sky-200 bg-sky-50 text-sky-800",
  muted: "border-border bg-muted text-muted-foreground",
};

export function StatusBadge({ children, tone = "default", className }: StatusBadgeProps) {
  return (
    <Badge variant={tone === "default" ? "secondary" : "outline"} className={cn("capitalize", toneClassName[tone], className)}>
      {children}
    </Badge>
  );
}
