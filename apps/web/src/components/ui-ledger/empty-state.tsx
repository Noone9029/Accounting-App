import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent className="py-8 text-center">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description ? <div className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{description}</div> : null}
        {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
      </CardContent>
    </Card>
  );
}
