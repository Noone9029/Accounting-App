import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  children: ReactNode;
  className?: string;
}

export function FilterBar({ children, className }: FilterBarProps) {
  return (
    <Card className={cn("mt-5", className)} size="sm">
      <CardContent>
        <div className="flex flex-wrap items-end gap-3">{children}</div>
      </CardContent>
    </Card>
  );
}
