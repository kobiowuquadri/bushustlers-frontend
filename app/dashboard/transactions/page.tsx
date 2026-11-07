"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowLeftRight, Search } from "lucide-react";
import { api } from "@/lib/api";
import { formatAsset, formatDateTime, formatNaira } from "@/lib/format";
import { ATTEMPT_STATUS } from "@/lib/status";
import type { Paged, Transaction } from "@/lib/types";
import { Card, EmptyState, ErrorState, Input, PageHeader, PageSkeleton, Pagination, Pill, Select, Skeleton, StatusPill } from "@/components/ui";

const STATUSES = [
  { value: "", label: "All statuses" },
  { value: "awaiting_payment", label: "Awaiting payment" },
  { value: "processing", label: "Processing" },
  { value: "confirmed", label: "Confirmed" },
  { value: "needs_review", label: "Needs review" },
  { value: "failed", label: "Failed" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Closed" },
];

function Transactions() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState(params.get("status") ?? "");
  const [route, setRoute] = useState("");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const tx = useQuery({
    queryKey: ["transactions", status, route, debounced, page],
    queryFn: () => api<Paged<Transaction>>(`/transactions?page=${page}${status ? `&status=${status}` : ""}${route ? `&route=${route}` : ""}${debounced ? `&search=${encodeURIComponent(debounced)}` : ""}`),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader title="Transactions" description="Every payment attempt, with the provider reference, route, amounts and verified status." />
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_200px_200px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input type="search" aria-label="Search transactions" placeholder="Order or provider reference" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
        </div>
        <Select aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Select>
        <Select aria-label="Route" value={route} onChange={(e) => { setRoute(e.target.value); setPage(1); }}>
          <option value="">All routes</option>
          <option value="bank_transfer">Bank transfer</option>
          <option value="stablecoin">Stablecoin</option>
        </Select>
      </div>
      <Card className="overflow-hidden">
        {tx.isPending ? (
          <div className="space-y-3 p-5">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : tx.isError ? (
          <ErrorState error={tx.error} onRetry={() => tx.refetch()} />
        ) : tx.data.items.length === 0 ? (
          <EmptyState icon={<ArrowLeftRight className="size-6" aria-hidden />} title="No transactions" description={status || route || debounced ? "Nothing matches these filters." : "When a buyer starts paying through one of your links, it shows up here."} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <caption className="sr-only">Transactions</caption>
                <thead className="border-b border-line bg-ivory/60 text-xs font-semibold uppercase tracking-wide text-muted">
                  <tr>
                    <th scope="col" className="px-5 py-3">Order</th>
                    <th scope="col" className="px-3 py-3">Route</th>
                    <th scope="col" className="px-3 py-3">Provider ref</th>
                    <th scope="col" className="px-3 py-3 text-right">Amount</th>
                    <th scope="col" className="px-3 py-3 text-right">Fee</th>
                    <th scope="col" className="px-3 py-3">Status</th>
                    <th scope="col" className="px-5 py-3 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {tx.data.items.map((t) => (
                    <tr key={t.id} className="cursor-pointer hover:bg-ivory/50" onClick={() => router.push(`/dashboard/transactions/${t.id}`)}>
                      <td className="px-5 py-3.5">
                        <Link href={`/dashboard/transactions/${t.id}`} className="font-semibold hover:underline" onClick={(e) => e.stopPropagation()}>
                          {t.order?.reference ?? "—"}
                        </Link>
                      </td>
                      <td className="px-3 py-3.5">
                        {t.routeLabel}
                        {t.providerMode !== "production" ? <Pill tone="neutral" className="ml-2">{t.providerMode}</Pill> : null}
                      </td>
                      <td className="max-w-40 truncate px-3 py-3.5 font-mono text-xs text-muted">{t.providerReference ?? "—"}</td>
                      <td className="tabular px-3 py-3.5 text-right font-semibold">
                        {formatNaira(t.receivedAmountMinor ?? t.expectedAmountMinor)}
                        {t.route === "stablecoin" && t.assetAmount ? <span className="block text-xs font-normal text-muted">{formatAsset(t.receivedAmount ?? t.assetAmount, t.asset)}</span> : null}
                      </td>
                      <td className="tabular px-3 py-3.5 text-right text-muted">{t.platformFeeMinor ? formatNaira(t.platformFeeMinor) : "—"}</td>
                      <td className="px-3 py-3.5"><StatusPill meta={ATTEMPT_STATUS[t.status]} /></td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right text-muted">{formatDateTime(t.confirmedAt ?? t.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pagination={tx.data.pagination} onPage={setPage} />
          </>
        )}
      </Card>
    </>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Transactions />
    </Suspense>
  );
}
