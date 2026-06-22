"use client";

import { ArrowLeft } from "lucide-react";
import { SalesInventoryReturnForm } from "@/components/forms/sales-inventory-return-form";
import { LedgerButton, LedgerPage, LedgerPageBody, LedgerPageHeader } from "@/components/ui/ledger-system";

export default function NewSalesInventoryReturnPage() {
  return (
    <LedgerPage>
      <LedgerPageHeader
        eyebrow="Sales inventory"
        title="New sales inventory return"
        description="Record customer-returned stock as an operational document. Stock movement is posted later through the explicit action."
        actions={<LedgerButton href="/sales/inventory-returns" icon={ArrowLeft}>Back</LedgerButton>}
      />
      <LedgerPageBody>
        <SalesInventoryReturnForm />
      </LedgerPageBody>
    </LedgerPage>
  );
}
