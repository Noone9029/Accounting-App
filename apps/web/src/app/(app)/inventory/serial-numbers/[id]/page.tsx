import { SerialNumberDetailPage } from "@/components/inventory/traceability-setup-pages";

export default function InventorySerialNumberDetailRoute({ params }: { params: { id: string } }) {
  return <SerialNumberDetailPage id={params.id} />;
}
