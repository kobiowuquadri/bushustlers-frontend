import type { Metadata } from "next";
import { Suspense } from "react";
import { Spinner } from "@/components/ui";
import { CheckoutView } from "./checkout-view";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center">
          <Spinner label="Loading checkout" />
        </div>
      }
    >
      <CheckoutView />
    </Suspense>
  );
}
