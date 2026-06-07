import { BatchDetailPage } from "@/components/inventory/traceability-setup-pages";

export default function InventoryBatchDetailRoute({ params }: { params: { id: string } }) {
  return <BatchDetailPage id={params.id} />;
}
