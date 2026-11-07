"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Plus, ShoppingBag } from "lucide-react";
import { api } from "@/lib/api";
import { useMe } from "@/lib/hooks";
import { formatNaira, formatRelative } from "@/lib/format";
import { ATTEMPT_STATUS } from "@/lib/status";
import type { Overview } from "@/lib/types";
import { ButtonLink, Card, CardHeader, EmptyState, ErrorState, PageHeader, PageSkeleton, StatusPill, Tabs } from "@/components/ui";

const PERIODS = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
] as const;

function Metric({ label, value, detail, href, tone = "default" }: { label: string; value: string; detail?: string; href?: string; tone?: "default" | "alert" }) {
  const body = (
    <>
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className={`tabular mt-2 text-2xl font-bold tracking-tight sm:text-[28px] ${tone === "alert" ? "text-red-ink" : "text-ink"}`}>{value}</p>
      {detail ? <p className="mt-1 text-sm text-muted">{detail}</p> : null}
    </>
  );
  return href ? (
    <Link href={href} className="group rounded-card border border-line/70 bg-paper p-5 shadow-card transition-colors hover:border-forest/30">
      {body}
      <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-ink opacity-80 group-hover:opacity-100">
        View <ArrowRight className="size-3.5" aria-hidden />
      </span>
    </Link>
  ) : (
    <div className="rounded-card border border-line/70 bg-paper p-5 shadow-card">{body}</div>
  );
}

export default function OverviewPage() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["value"]>("30d");
  const me = useMe();
  const overview = useQuery({ queryKey: ["overview", period], queryFn: () => api<Overview>(`/overview?period=${period}`), refetchInterval: 30_000 });

  if (overview.isPending) return <PageSkeleton />;
  if (overview.isError) return <ErrorState error={overview.error} onRetry={() => overview.refetch()} />;
  const o = overview.data;
  const firstName = me.data?.user.fullName?.split(" ")[0];
  const isEmpty = o.confirmedPaymentCount === 0 && o.awaitingPayment.count === 0 && o.recentTransactions.length === 0 && o.paidAwaitingFulfilment === 0;

  return (
    <>
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : "Overview"}
        description="What's paid, what's waiting, and what needs you."
        actions={<Tabs label="Period" tabs={PERIODS.map((p) => ({ value: p.value, label: p.label }))} value={period} onChange={setPeriod} />}
      />

      {isEmpty ? (
        <Card>
          <EmptyState
            icon={<ShoppingBag className="size-6" aria-hidden />}
            title="Create your first payment link"
            description="Add an order, share the link in your Instagram or WhatsApp chat, and Bushustlers tells you when it's safe to ship."
            action={
              <ButtonLink href="/dashboard/orders/new" icon={<Plus className="size-4" aria-hidden />}>
                Create payment link
              </ButtonLink>
            }
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Confirmed payments" value={formatNaira(o.confirmedVolumeMinor)} detail={`${o.confirmedPaymentCount} verified in the last ${PERIODS.find((p) => p.value === period)?.label}`} href="/dashboard/transactions?status=confirmed" />
            <Metric label="Awaiting payment" value={String(o.awaitingPayment.count)} detail={`${formatNaira(o.awaitingPayment.valueMinor)} in open links`} href="/dashboard/orders?view=awaiting_payment" />
            <Metric label="Paid, ready to fulfil" value={String(o.paidAwaitingFulfilment)} detail="Safe to ship" href="/dashboard/orders?view=to_fulfil" />
            <Metric label="Needs review" value={String(o.needsReview)} detail="Hold these before shipping" href="/dashboard/orders?view=needs_review" tone={o.needsReview ? "alert" : "default"} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <Card>
              <CardHeader
                title="Recent payments"
                action={
                  <Link href="/dashboard/transactions" className="text-sm font-semibold text-ink hover:underline">
                    All transactions
                  </Link>
                }
              />
              {o.recentTransactions.length ? (
                <ul className="mt-2 divide-y divide-line">
                  {o.recentTransactions.map((t) => (
                    <li key={t.id}>
                      <Link href={`/dashboard/transactions/${t.id}`} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-ivory/50 sm:px-6">
                        <div className="min-w-0">
                          <p className="font-semibold">{t.order?.reference ?? "Order"}</p>
                          <p className="truncate text-sm text-muted">{t.routeLabel} · {formatRelative(t.confirmedAt ?? t.createdAt)}</p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="tabular font-semibold">{formatNaira(t.receivedAmountMinor ?? t.expectedAmountMinor)}</span>
                          <StatusPill meta={ATTEMPT_STATUS[t.status]} />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-6 py-6 text-sm text-muted">No payments started yet.</p>
              )}
            </Card>

            <Card className="h-fit p-5 sm:p-6">
              <h2 className="text-base font-semibold">Pending settlement</h2>
              <p className="tabular mt-2 text-2xl font-bold">{formatNaira(o.pendingSettlement.netMinor)}</p>
              <p className="mt-1 text-sm text-muted">
                Net of fees across {o.pendingSettlement.count} confirmed {o.pendingSettlement.count === 1 ? "payment" : "payments"} not yet paid out. This is not money in your bank yet.
              </p>
              <Link href="/dashboard/settlements" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold hover:underline">
                Settlements <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
