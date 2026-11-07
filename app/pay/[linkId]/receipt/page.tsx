"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Printer } from "lucide-react";
import { api } from "@/lib/api";
import { formatAsset, formatDateTime, formatNaira } from "@/lib/format";
import type { Receipt } from "@/lib/types";
import { LogoOnPanel } from "@/components/brand";
import { Button, Card, ErrorState, Pill, Spinner } from "@/components/ui";

function ReceiptView() {
  const { linkId } = useParams<{ linkId: string }>();
  const receipt = useQuery({ queryKey: ["receipt", linkId], queryFn: () => api<{ receipt: Receipt }>(`/checkout/${linkId}/receipt`).then((r) => r.receipt) });

  if (receipt.isPending) return <div className="grid place-items-center py-24"><Spinner label="Loading receipt" /></div>;
  if (receipt.isError) return <Card><ErrorState error={receipt.error} /></Card>;
  const r = receipt.data;
  const testMode = r.payments.some((p) => p.mode !== "production");

  return (
    <Card className="p-6 sm:p-8 print:border-0 print:shadow-none">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Payment receipt</p>
          <h1 className="mt-1 text-2xl font-bold">{r.merchant.name}</h1>
          <p className="mt-1 font-mono text-sm text-muted">{r.receiptNumber}</p>
        </div>
        <Pill tone="success">Paid</Pill>
      </div>
      {testMode ? <p className="mt-4 rounded-xl bg-amber-tint px-3 py-2 text-sm text-amber-ink">Test receipt: this payment was made in {r.payments[0]?.mode === "demo" ? "demo" : "sandbox"} mode. No real money moved.</p> : null}

      <div className="mt-6 flex items-center gap-3 rounded-2xl bg-mint-tint px-4 py-3 text-forest">
        <CheckCircle2 className="size-6 shrink-0" aria-hidden />
        <div>
          <p className="tabular text-xl font-bold">{formatNaira(r.amountPaidMinor)}</p>
          <p className="text-sm">Confirmed {formatDateTime(r.paidAt)} · Order {r.order.reference}</p>
        </div>
      </div>

      <table className="mt-6 w-full text-sm">
        <caption className="sr-only">Items</caption>
        <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
          <tr>
            <th scope="col" className="py-2 font-semibold">Item</th>
            <th scope="col" className="py-2 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {r.order.items.map((item, index) => (
            <tr key={index}>
              <td className="py-2.5">{item.quantity} × {item.name}</td>
              <td className="tabular py-2.5 text-right">{formatNaira(item.lineTotalMinor)}</td>
            </tr>
          ))}
          {r.order.deliveryFeeMinor !== "0" ? (
            <tr>
              <td className="py-2.5">Delivery</td>
              <td className="tabular py-2.5 text-right">{formatNaira(r.order.deliveryFeeMinor)}</td>
            </tr>
          ) : null}
        </tbody>
        <tfoot className="border-t-2 border-ink/80 font-bold">
          <tr>
            <td className="py-3">Order total</td>
            <td className="tabular py-3 text-right">{formatNaira(r.order.totalMinor)}</td>
          </tr>
        </tfoot>
      </table>

      <h2 className="mt-6 text-sm font-semibold">Payment</h2>
      <ul className="mt-2 space-y-2 text-sm">
        {r.payments.map((p) => (
          <li key={p.id} className="rounded-xl bg-ivory/70 px-3.5 py-3">
            <p className="font-medium">{p.routeLabel}</p>
            <p className="text-muted">
              {formatNaira(p.amountMinor)}
              {p.assetAmount ? ` · ${formatAsset(p.assetAmount, p.asset)}` : ""}
              {p.providerReference ? ` · Provider ref ${p.providerReference}` : ""}
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-xs text-muted">Payment verified with the payment provider by Bushustlers. For questions about your order or delivery, contact {r.merchant.name}.</p>
      <Button variant="secondary" className="no-print mt-6" onClick={() => window.print()} icon={<Printer className="size-4" aria-hidden />}>
        Print or save as PDF
      </Button>
    </Card>
  );
}

export default function ReceiptPage() {
  return (
    <div className="min-h-screen bg-ivory">
      <header className="no-print mx-auto flex max-w-xl items-center px-4 pt-5">
        <LogoOnPanel height={20} />
      </header>
      <main className="mx-auto max-w-xl px-4 pb-12 pt-5">
        <Suspense fallback={<div className="grid place-items-center py-24"><Spinner label="Loading receipt" /></div>}>
          <ReceiptView />
        </Suspense>
      </main>
    </div>
  );
}
