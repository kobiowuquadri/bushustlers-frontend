import type { Metadata } from "next";
import { OrderForm } from "@/components/order-form";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "New order" };

export default function NewOrderPage() {
  return (
    <>
      <PageHeader title="New order" description="Add the customer and items, then share one payment link for this order." back={{ href: "/dashboard/orders", label: "Orders" }} />
      <OrderForm />
    </>
  );
}
