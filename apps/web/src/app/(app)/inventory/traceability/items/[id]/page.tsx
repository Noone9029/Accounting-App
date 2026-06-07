import { ItemTraceabilityPage } from "@/components/inventory/traceability-setup-pages";

export default function InventoryItemTraceabilityRoute({ params }: { params: { id: string } }) {
  return <ItemTraceabilityPage itemId={params.id} />;
}
