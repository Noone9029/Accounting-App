import Link from "next/link";
import type { ComponentType, SVGProps } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ActionGridItem {
  label: string;
  href: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
}

interface ActionGridProps {
  items: readonly ActionGridItem[];
  className?: string;
}

export function ActionGrid({ items, className }: ActionGridProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <Card size="sm" className={className}>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={buttonVariants({
                  variant: "outline",
                  className: "h-auto min-h-16 flex-col gap-2 py-3",
                })}
              >
                {Icon ? <Icon data-icon="inline-start" className={cn("text-primary")} aria-hidden="true" /> : null}
                <span className="text-center text-xs leading-4">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
