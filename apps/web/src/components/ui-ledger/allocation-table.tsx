import type { ReactNode } from "react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTable } from "@/components/ui-ledger/data-table";
import { cn } from "@/lib/utils";

interface AllocationColumn {
  key: string;
  label: ReactNode;
  className?: string;
}

interface AllocationTableProps<Row> {
  columns: readonly AllocationColumn[];
  rows: readonly Row[];
  rowKey: (row: Row) => string;
  renderCell: (row: Row, columnKey: string) => ReactNode;
  emptyState?: ReactNode;
  minWidth?: string;
  className?: string;
  framed?: boolean;
}

export function AllocationTable<Row>({
  columns,
  rows,
  rowKey,
  renderCell,
  emptyState,
  minWidth = "min-w-[760px]",
  className,
  framed = true,
}: AllocationTableProps<Row>) {
  const table = (
    <>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column.key} className={column.className}>
              {column.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length > 0 ? (
          rows.map((row) => (
            <TableRow key={rowKey(row)}>
              {columns.map((column) => (
                <TableCell key={column.key} className={cn("align-top", column.className)}>
                  {renderCell(row, column.key)}
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : emptyState ? (
          <TableRow>
            <TableCell colSpan={columns.length} className="whitespace-normal p-4">
              {emptyState}
            </TableCell>
          </TableRow>
        ) : null}
      </TableBody>
    </>
  );

  if (!framed) {
    return <Table className={cn(minWidth, className)}>{table}</Table>;
  }

  return (
    <DataTable minWidth={minWidth} className={className}>
      {table}
    </DataTable>
  );
}
