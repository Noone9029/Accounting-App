"use client";
import { useParams } from "next/navigation";
import { FixedAssetDetailPage } from "@/components/fixed-assets/fixed-assets-page";
export default function FixedAssetDetailRoute() { const params = useParams<{ id: string }>(); return <FixedAssetDetailPage id={params.id} />; }
