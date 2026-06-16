import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface DataTableProps {
  children: ReactNode;
  minWidth?: string;
  className?: string;
  tableClassName?: string;
}

export function DataTable({ children, minWidth, className, tableClassName }: DataTableProps) {
  return (
    <Card className={cn("mt-5 overflow-hidden p-0", className)}>
      <Table className={cn(minWidth, tableClassName)}>{children}</Table>
    </Card>
  );
}
