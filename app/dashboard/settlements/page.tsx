"use client";

import Link from "next/link";
import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Landmark } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useBusiness } from "@/lib/hooks";
import { formatDateTime, formatNaira } from "@/lib/format";
import { SETTLEMENT_STATUS } from "@/lib/status";
import type { SettlementList } from "@/lib/types";
import { Button, Card, EmptyState, ErrorState, Notice, PageHeader, Pagination, Pill, Skeleton, StatusPill, Tabs, useToast } from "@/components/ui";

const FILTERS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "settled", label: "Settled" },
  { value: "failed", label: "Failed" },
];

export default function SettlementsPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const toast = useToast();
  const business = useBusiness();
  const demoTools = Boolean(business.data?.environment.payments.demoTools);
  const list = useQuery({ queryKey: ["settlements", status, page], queryFn: () => api<SettlementList>(`/settlements?page=${page}${status ? `&status=${status}` : ""}`), placeholderData: keepPreviousData });
  const simulate = useMutation({
    mutationFn: ({ id, outcome }: { id: string; outcome: "settled" | "failed" }) => api(`/settlements/${id}/simulate`, { method: "POST", body: { outcome } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settlements"] }),
    onError: (error) => toast.show({ tone: "danger", title: "Simulation failed", description: error instanceof ApiError ? error.message : undefined }),
  });

  return (
    <>
      <PageHeader title="Settlements" description="What happens to money after a payment is confirmed." />
      {list.data ? (
        <Notice tone={list.data.integration.providerMode === "demo" ? "warning" : "info"} title="Confirmed payment is not money in your bank" className="mb-6">
          {list.data.integration.message} Each confirmed payment moves from <strong>Settlement pending</strong> to <strong>Settled</strong> only when a payout is recorded.
        </Notice>
      ) : null}

      {list.data ? (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          {(["pending", "settled", "failed"] as const).map((key) => (
            <div key={key} className="rounded-card border border-line/70 bg-paper p-5 shadow-card">
              <StatusPill meta={SETTLEMENT_STATUS[key]} />
              <p className="tabular mt-3 text-2xl font-bold">{formatNaira(list.data.summary[key].netMinor)}</p>
              <p className="mt-1 text-sm text-muted">Net of fees · {list.data.summary[key].count} {list.data.summary[key].count === 1 ? "payment" : "payments"}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mb-4">
        <Tabs label="Filter settlements" tabs={FILTERS} value={status} onChange={(v) => { setStatus(v); setPage(1); }} />
      </div>
      <Card className="overflow-hidden">
        {list.isPending ? (
          <div className="space-y-3 p-5">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => list.refetch()} />
        ) : list.data.items.length === 0 ? (
          <EmptyState icon={<Landmark className="size-6" aria-hidden />} title="No settlement records yet" description="A settlement record is created for every payment Bushustlers confirms." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <caption className="sr-only">Settlements</caption>
                <thead className="border-b border-line bg-ivory/60 text-xs font-semibold uppercase tracking-wide text-muted">
                  <tr>
                    <th scope="col" className="px-5 py-3">Order</th>
                    <th scope="col" className="px-3 py-3 text-right">Paid by buyer</th>
                    <th scope="col" className="px-3 py-3 text-right">Provider fees</th>
                    <th scope="col" className="px-3 py-3 text-right">Bushustlers fee</th>
                    <th scope="col" className="px-3 py-3 text-right">Net</th>
                    <th scope="col" className="px-3 py-3">Status</th>
                    <th scope="col" className="px-5 py-3 text-right">Confirmed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {list.data.items.map((s) => (
                    <tr key={s.id}>
                      <td className="px-5 py-3.5">
                        {s.order ? <Link href={`/dashboard/orders/${s.order.id}`} className="font-semibold hover:underline">{s.order.reference}</Link> : "—"}
                        <p className="text-xs text-muted">{s.payment?.routeLabel}</p>
                      </td>
                      <td className="tabular px-3 py-3.5 text-right">{formatNaira(s.grossMinor)}</td>
                      <td className="tabular px-3 py-3.5 text-right text-muted">−{formatNaira(s.providerFeeMinor)}</td>
                      <td className="tabular px-3 py-3.5 text-right text-muted" title={s.feeBasis}>−{formatNaira(s.platformFeeMinor)}</td>
                      <td className="tabular px-3 py-3.5 text-right font-semibold">{formatNaira(s.netMinor)}</td>
                      <td className="px-3 py-3.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StatusPill meta={SETTLEMENT_STATUS[s.status]} />
                          {s.simulated ? <Pill tone="neutral">Simulated</Pill> : null}
                        </div>
                        {demoTools && s.simulated && s.status === "pending" ? (
                          <div className="mt-2 flex gap-1.5">
                            <Button size="sm" variant="secondary" onClick={() => simulate.mutate({ id: s.id, outcome: "settled" })} loading={simulate.isPending && simulate.variables?.id === s.id && simulate.variables.outcome === "settled"}>Mark settled</Button>
                            <Button size="sm" variant="ghost" onClick={() => simulate.mutate({ id: s.id, outcome: "failed" })}>Fail</Button>
                          </div>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right text-muted">{formatDateTime(s.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pagination={list.data.pagination} onPage={setPage} />
          </>
        )}
      </Card>
      <p className="mt-4 text-xs text-muted">Fees follow the proposed pilot pricing and are deducted from settlement, never added to the buyer&apos;s total.</p>
    </>
  );
}
