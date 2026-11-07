"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { OrderDetail } from "@/lib/types";
import { OrderForm } from "@/components/order-form";
import { ErrorState, Notice, PageHeader, PageSkeleton } from "@/components/ui";

function EditOrder() {
  const { id } = useParams<{ id: string }>();
  const order = useQuery({ queryKey: ["order", id], queryFn: () => api<{ order: OrderDetail }>(`/orders/${id}`).then((r) => r.order) });
  if (order.isPending) return <PageSkeleton />;
  if (order.isError) return <ErrorState error={order.error} onRetry={() => order.refetch()} />;
  return (
    <>
      <PageHeader title={`Edit ${order.data.reference}`} back={{ href: `/dashboard/orders/${id}`, label: order.data.reference }} />
      {order.data.editable ? (
        <OrderForm order={order.data} />
      ) : (
        <Notice tone="warning" title="This order can't be edited right now">
          Orders lock while a payment link is active or once money has been received. Disable the link first if no payment has started.
        </Notice>
      )}
    </>
  );
}

export default function EditOrderPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EditOrder />
    </Suspense>
  );
}
