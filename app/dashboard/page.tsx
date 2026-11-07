"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Plus, ShoppingBag } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useMe } from "@/lib/hooks";
import { formatNaira, formatRelative } from "@/lib/format";
import { ATTEMPT_STATUS } from "@/lib/status";
import type { Overview } from "@/lib/types";
import { ButtonLink, EmptyState, ErrorState, PageSkeleton, StatusPill, Tabs } from "@/components/ui";

const PERIODS = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
] as const;

// Sharp-edged, colour-coded metric tiles. Each colour carries the status meaning used everywhere else:
// forest = verified money, amber = don't ship yet, mint = safe to ship, red = hold for review.
const TILE = {
  forest: { box: "bg-forest text-white", label: "text-on-dark-muted", detail: "text-on-dark", link: "text-mint" },
  amber: { box: "bg-amber-tint text-amber-ink", label: "text-amber-ink/80", detail: "text-amber-ink/90", link: "text-amber-ink" },
  mint: { box: "bg-mint-tint text-forest", label: "text-forest/75", detail: "text-forest/85", link: "text-forest" },
  red: { box: "bg-red-tint text-red-ink", label: "text-red-ink/80", detail: "text-red-ink/90", link: "text-red-ink" },
  sky: { box: "bg-sky-tint text-sky-ink", label: "text-sky-ink/80", detail: "text-sky-ink/90", link: "text-sky-ink" },
} as const;

function Metric({ label, value, detail, href, tone }: { label: string; value: string; detail?: string; href: string; tone: keyof typeof TILE }) {
  const t = TILE[tone];
  return (
    <Link href={href} className={cn("group flex min-h-40 flex-col p-5 transition-[filter] hover:brightness-[0.97] focus-visible:rounded-none sm:p-6", t.box)}>
      <p className={cn("text-sm font-semibold", t.label)}>{label}</p>
      <p className="tabular mt-3 text-3xl font-bold tracking-tight">{value}</p>
      {detail ? <p className={cn("mt-1 text-sm", t.detail)}>{detail}</p> : null}
      <span className={cn("mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold", t.link)}>
        View <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Link>
  );
}

export default function OverviewPage() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["value"]>("30d");
  const me = useMe();
  const overview = useQuery({ queryKey: ["overview", period], queryFn: () => api<Overview>(`/overview?period=${period}`), refetchInterval: 30_000 });
  const firstName = me.data?.user.fullName?.split(" ")[0];

  const banner = (
    <section className="on-dark relative mb-6 overflow-hidden bg-forest" aria-labelledby="overview-title">
      {/* Decorative brand artwork; text sits on its own layer */}
      <Image src="/brand/banner.webp" alt="" fill priority sizes="100vw" className="object-cover object-right" />
      <div className="absolute inset-0 bg-gradient-to-r from-forest via-forest/85 to-forest/10" aria-hidden />
      <div className="relative flex flex-col gap-6 px-6 py-8 sm:px-8 sm:py-10 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-xl">
          <p className="text-sm font-semibold text-mint">{me.data?.business?.name ?? "Overview"}</p>
          <h1 id="overview-title" className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {firstName ? `Welcome back, ${firstName}` : "Overview"}
          </h1>
          <p className="mt-2 text-on-dark">What&apos;s paid, what&apos;s waiting, and what needs you.</p>
          <ButtonLink href="/dashboard/orders/new" className="mt-5" icon={<Plus className="size-4" aria-hidden />}>
            Create payment link
          </ButtonLink>
        </div>
        {/* Dark pill keeps the switcher legible over the bright ribbon artwork */}
        <div className="w-fit rounded-full bg-forest/90 p-1 pb-0 backdrop-blur-sm">
          <Tabs label="Period" onDark tabs={PERIODS.map((p) => ({ value: p.value, label: p.label }))} value={period} onChange={setPeriod} />
        </div>
      </div>
    </section>
  );

  if (overview.isPending) {
    return (
      <>
        {banner}
        <PageSkeleton />
      </>
    );
  }
  if (overview.isError) {
    return (
      <>
        {banner}
        <ErrorState error={overview.error} onRetry={() => overview.refetch()} />
      </>
    );
  }
  const o = overview.data;
  const isEmpty = o.confirmedPaymentCount === 0 && o.awaitingPayment.count === 0 && o.recentTransactions.length === 0 && o.paidAwaitingFulfilment === 0;
  const periodLabel = PERIODS.find((p) => p.value === period)?.label;

  return (
    <>
      {banner}
      {isEmpty ? (
        <div className="border border-line/70 bg-paper">
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
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric tone="forest" label="Confirmed payments" value={formatNaira(o.confirmedVolumeMinor)} detail={`${o.confirmedPaymentCount} verified in the last ${periodLabel}`} href="/dashboard/transactions?status=confirmed" />
            <Metric tone="amber" label="Awaiting payment" value={String(o.awaitingPayment.count)} detail={`${formatNaira(o.awaitingPayment.valueMinor)} in open links · don't ship yet`} href="/dashboard/orders?view=awaiting_payment" />
            <Metric tone="mint" label="Paid, ready to fulfil" value={String(o.paidAwaitingFulfilment)} detail="Safe to ship" href="/dashboard/orders?view=to_fulfil" />
            <Metric tone="red" label="Needs review" value={String(o.needsReview)} detail="Hold these before shipping" href="/dashboard/orders?view=needs_review" />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="border border-line/70 bg-paper" aria-labelledby="recent-title">
              <div className="flex items-center justify-between gap-3 px-5 pt-5 sm:px-6">
                <h2 id="recent-title" className="text-base font-semibold">Recent payments</h2>
                <Link href="/dashboard/transactions" className="text-sm font-semibold text-ink hover:underline">
                  All transactions
                </Link>
              </div>
              {o.recentTransactions.length ? (
                <ul className="mt-3 divide-y divide-line">
                  {o.recentTransactions.map((t) => (
                    <li key={t.id}>
                      <Link href={`/dashboard/transactions/${t.id}`} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-ivory/60 sm:px-6">
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
            </section>

            <Link href="/dashboard/settlements" className={cn("group flex h-fit flex-col p-5 transition-[filter] hover:brightness-[0.97] sm:p-6", TILE.sky.box)}>
              <p className="text-sm font-semibold text-sky-ink/80">Pending settlement</p>
              <p className="tabular mt-3 text-3xl font-bold tracking-tight">{formatNaira(o.pendingSettlement.netMinor)}</p>
              <p className="mt-1 text-sm text-sky-ink/90">
                Net of fees across {o.pendingSettlement.count} confirmed {o.pendingSettlement.count === 1 ? "payment" : "payments"} not yet paid out. This is not money in your bank yet.
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold">
                Settlements <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>
          </div>
        </>
      )}
    </>
  );
}
