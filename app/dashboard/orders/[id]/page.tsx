import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/ui";
import { OrderDetailView } from "./order-detail";

export const metadata: Metadata = { title: "Order" };

export default function OrderPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <OrderDetailView />
    </Suspense>
  );
}
