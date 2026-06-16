import type { ReactNode } from "react";

import { Card, CardAction, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PanelSectionProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function PanelSection({ title, description, action, children, className, contentClassName }: PanelSectionProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <h2 data-slot="card-title" className="text-base font-medium leading-snug text-foreground">
          {title}
        </h2>
        {description ? <CardDescription>{description}</CardDescription> : null}
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      <CardContent className={cn("min-w-0", contentClassName)}>{children}</CardContent>
    </Card>
  );
}
