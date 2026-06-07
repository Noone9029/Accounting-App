import { BinLocationDetailPage } from "@/components/inventory/traceability-setup-pages";

export default function InventoryBinLocationDetailRoute({ params }: { params: { id: string } }) {
  return <BinLocationDetailPage id={params.id} />;
}
