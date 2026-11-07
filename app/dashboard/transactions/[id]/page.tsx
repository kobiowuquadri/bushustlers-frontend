"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FlaskConical, RefreshCw } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { formatAsset, formatDateTime, formatNaira, formatRelative } from "@/lib/format";
import { ATTEMPT_STATUS, SETTLEMENT_STATUS } from "@/lib/status";
import type { TransactionDetail } from "@/lib/types";
import { Timeline } from "@/components/timeline";
import { ReviewDecision } from "../../orders/[id]/order-detail";
import { Button, Card, CardHeader, ErrorState, Notice, PageHeader, PageSkeleton, Pill, Row, StatusPill, useToast } from "@/components/ui";

function TransactionView() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const toast = useToast();
  const tx = useQuery({ queryKey: ["transaction", id], queryFn: () => api<{ transaction: TransactionDetail }>(`/transactions/${id}`).then((r) => r.transaction) });
  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["transaction", id] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    queryClient.invalidateQueries({ queryKey: ["overview"] });
    if (tx.data?.order) queryClient.invalidateQueries({ queryKey: ["order", tx.data.order.id] });
  };
  const refresh = useMutation({
    mutationFn: () => api<{ transaction: TransactionDetail }>(`/transactions/${id}/refresh`, { method: "POST" }),
    onSuccess: (data) => {
      queryClient.setQueryData(["transaction", id], data.transaction);
      refreshAll();
      toast.show({ tone: "success", title: "Checked with the provider", description: data.transaction.statusText });
    },
    onError: (error) => toast.show({ tone: "danger", title: "Couldn't check status", description: error instanceof ApiError ? error.message : undefined }),
  });
  const simulate = useMutation({
    mutationFn: (outcome: string) => api<{ transaction: TransactionDetail }>(`/transactions/${id}/simulate`, { method: "POST", body: { outcome } }),
    onSuccess: (data) => {
      queryClient.setQueryData(["transaction", id], data.transaction);
      refreshAll();
    },
    onError: (error) => toast.show({ tone: "danger", title: "Simulation failed", description: error instanceof ApiError ? error.message : undefined }),
  });

  if (tx.isPending) return <PageSkeleton />;
  if (tx.isError) return <ErrorState error={tx.error} onRetry={() => tx.refetch()} />;
  const t = tx.data;
  const providerFeeTotal = t.providerFees.filter((f) => f.currency === "NGN");

  return (
    <>
      <PageHeader
        back={{ href: "/dashboard/transactions", label: "Transactions" }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {t.routeLabel}
            <StatusPill meta={ATTEMPT_STATUS[t.status]} />
          </span>
        }
        description={
          <>
            For order{" "}
            {t.order ? (
              <Link href={`/dashboard/orders/${t.order.id}`} className="font-semibold text-ink hover:underline">
                {t.order.reference}
              </Link>
            ) : (
              "—"
            )}{" "}
            · started {formatDateTime(t.createdAt)}
          </>
        }
        actions={
          t.actions.canRefresh ? (
            <Button variant="secondary" size="sm" onClick={() => refresh.mutate()} loading={refresh.isPending} icon={<RefreshCw className="size-4" aria-hidden />}>
              Check status with provider
            </Button>
          ) : null
        }
      />

      <Notice tone={t.status === "confirmed" ? "success" : t.status === "needs_review" || t.status === "failed" ? "danger" : t.status === "processing" ? "info" : "warning"} className="mb-6" title={ATTEMPT_STATUS[t.status].label}>
        {t.statusText}
        {t.reviewReasonText ? ` ${t.reviewReasonText}` : ""}
        {t.lastCheckedAt ? <span className="block text-xs opacity-80">Last checked with the provider {formatRelative(t.lastCheckedAt)}.</span> : null}
      </Notice>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="space-y-6">
          {t.actions.canResolve ? (
            <Card>
              <CardHeader title="Your decision" />
              <div className="px-5 pb-5 sm:px-6 sm:pb-6">
                <ReviewDecision payment={t} onDone={refreshAll} />
              </div>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Amounts" />
            <dl className="divide-y divide-line px-5 pb-3 sm:px-6">
              <Row label="Order total requested">{formatNaira(t.expectedAmountMinor)}</Row>
              {t.route === "stablecoin" ? <Row label={`Quoted ${t.asset ?? ""} amount`}>{formatAsset(t.assetAmount, t.asset)}</Row> : null}
              {t.rate ? <Row label={t.rateSource === "demo" ? "Demo rate (not a market quote)" : "Rate from provider quote"}>{t.rate} NGN per {t.asset}</Row> : null}
              <Row label="Received (provider reported)">
                {t.receivedAmountMinor ? formatNaira(t.receivedAmountMinor) : "Nothing yet"}
                {t.route === "stablecoin" && t.receivedAmount ? ` · ${formatAsset(t.receivedAmount, t.receivedCurrency)}` : ""}
              </Row>
              {t.settlementAmount ? <Row label="Credited after conversion and provider fees">{t.settlementCurrency === "NGN" ? formatNaira(toMinor(t.settlementAmount)) : formatAsset(t.settlementAmount, t.settlementCurrency)}</Row> : null}
              {providerFeeTotal.map((fee) => (
                <Row key={fee.name} label={`Provider fee: ${fee.name}`}>{formatAsset(fee.amount, fee.currency)}</Row>
              ))}
              <Row label="Bushustlers fee">{t.platformFeeMinor ? formatNaira(t.platformFeeMinor) : "Charged only once verified"}</Row>
            </dl>
          </Card>

          {t.actions.canSimulate ? (
            <Card className="border-dashed border-amber-dot/60 bg-amber-tint/30">
              <CardHeader title={<span className="flex items-center gap-2"><FlaskConical className="size-4" aria-hidden /> {t.actions.simulationKind === "demo" ? "Demo tools" : "Busha sandbox tools"}</span>} description={t.actions.simulationKind === "demo" ? "Simulate what the buyer and provider do. Each outcome is delivered as a signed notification and verified like a real one." : "Calls Busha's sandbox simulate-deposit endpoint for this transfer."} />
              <div className="flex flex-wrap gap-2 px-5 pb-5 sm:px-6 sm:pb-6">
                {(t.actions.simulationKind === "demo" ? ["paid", "underpaid", "overpaid", "processing", "failed", "expired"] : ["paid", "failed"]).map((outcome) => (
                  <Button key={outcome} variant="secondary" size="sm" onClick={() => simulate.mutate(outcome)} loading={simulate.isPending && simulate.variables === outcome}>
                    {{ paid: "Pays in full", underpaid: "Pays short", overpaid: "Pays extra", processing: "Payment detected", failed: "Fails", expired: "Expires" }[outcome]}
                  </Button>
                ))}
              </div>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="History" />
            <div className="px-5 pb-5 sm:px-6 sm:pb-6">
              <Timeline events={t.events} />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <h2 className="text-base font-semibold">References</h2>
            <dl className="mt-2 divide-y divide-line">
              <Row label="Bushustlers ref"><span className="font-mono text-xs">{t.reference}</span></Row>
              <Row label="Provider ref"><span className="font-mono text-xs">{t.providerReference ?? "—"}</span></Row>
              <Row label="Provider status">{t.providerStatus ?? "—"}</Row>
              <Row label="Mode"><Pill tone={t.providerMode === "production" ? "success" : "warning"}>{t.providerMode}</Pill></Row>
              {t.expiresAt ? <Row label="Instructions expire">{formatDateTime(t.expiresAt)}</Row> : null}
              {t.confirmedAt ? <Row label="Confirmed">{formatDateTime(t.confirmedAt)}</Row> : null}
            </dl>
          </Card>

          {t.settlement ? (
            <Card className="p-5 sm:p-6">
              <h2 className="text-base font-semibold">Settlement</h2>
              <dl className="mt-2 divide-y divide-line">
                <Row label="Status"><StatusPill meta={SETTLEMENT_STATUS[t.settlement.status]} /></Row>
                <Row label="Gross">{formatNaira(t.settlement.grossMinor)}</Row>
                <Row label="Provider fees">−{formatNaira(t.settlement.providerFeeMinor)}</Row>
                <Row label="Bushustlers fee">−{formatNaira(t.settlement.platformFeeMinor)}</Row>
                <Row label="Net">{formatNaira(t.settlement.netMinor)}</Row>
              </dl>
              <p className="mt-2 text-xs text-muted">{t.settlement.feeBasis}</p>
            </Card>
          ) : null}

          <Card className="p-5 sm:p-6">
            <h2 className="text-base font-semibold">Provider notifications</h2>
            {t.providerEvents.length ? (
              <ul className="mt-3 space-y-2 text-sm">
                {t.providerEvents.map((e, index) => (
                  <li key={index} className="flex items-center justify-between gap-3">
                    <span className="font-mono text-xs">{e.eventType}</span>
                    <span className="text-xs text-muted">{e.status} · {formatRelative(e.receivedAt)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted">None received yet. Status is also checked directly with the provider.</p>
            )}
            <p className="mt-3 text-xs text-muted">Each notification is signature-checked, stored once, and confirmed with a direct provider lookup before anything changes.</p>
          </Card>
        </div>
      </div>
    </>
  );
}

// "45000.5" -> "4500050"
function toMinor(major: string) {
  const [whole, fraction = ""] = major.split(".");
  return (BigInt(whole) * 100n + BigInt((fraction + "00").slice(0, 2))).toString();
}

export default function TransactionPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TransactionView />
    </Suspense>
  );
}
