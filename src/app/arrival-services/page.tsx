import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/app-shell";
import { ArrivalServices } from "@/features/arrival-services/arrival-services";
export const metadata: Metadata = { title: "Arrival services" };
export default function ArrivalServicesPage() {
  return <><PageHeader eyebrow="Beyond enrollment" title="One wallet. Your next arrival." description="Share a QR request and pay an arrival service directly in Testnet USDC." /><ArrivalServices /></>;
}
