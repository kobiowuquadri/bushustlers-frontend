import type { Metadata } from "next";
import { Suspense } from "react";
import { OrdersList } from "./orders-list";
import { PageSkeleton } from "@/components/ui";

export const metadata: Metadata = { title: "Orders" };

export default function OrdersPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <OrdersList />
    </Suspense>
  );
}
