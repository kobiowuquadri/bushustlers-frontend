"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, FileText, FlaskConical, Pencil, Truck, PackageCheck } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useBusiness } from "@/lib/hooks";
import { formatAsset, formatDateTime, formatNaira, formatRelative } from "@/lib/format";
import { ATTEMPT_STATUS, FULFILMENT_STATUS, orderPaymentMeta } from "@/lib/status";
import type { OrderDetail, Transaction } from "@/lib/types";
import { ShareLinkPanel } from "@/components/share-link";
import { Timeline } from "@/components/timeline";
import { Button, ButtonLink, Card, CardHeader, ConfirmDialog, ErrorState, Field, Input, Notice, PageHeader, PageSkeleton, Pill, Select, StatusPill, Textarea, useToast } from "@/components/ui";

const SAFE_TEXT: Record<string, { tone: "warning" | "danger" | "success" | "info"; title: string; body: string }> = {
  unpaid: { tone: "warning", title: "Don't ship yet", body: "No verified payment yet. Share the link with your customer; this page updates when the provider confirms the money." },
  processing: { tone: "info", title: "Don't ship yet", body: "A payment has been detected and the provider is still processing it." },
  needs_review: { tone: "danger", title: "Hold for review", body: "Money arrived but something doesn't match. Review the payment below before you ship." },
  paid: { tone: "success", title: "Safe to ship", body: "The provider confirmed the payment and Bushustlers matched the amount, currency and reference." },
};

export function OrderDetailView() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const toast = useToast();
  const business = useBusiness();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [expiresInHours, setExpiresInHours] = useState("72");
  const [fulfilmentNote, setFulfilmentNote] = useState("");

  // Poll while the order is waiting on a payment, for at most 20 minutes after the page opened.
  // The interval is derived from the query's own data inside the callback (React Query calls it while
  // constructing the observer, so it must not read variables declared later in this component).
  const [pollUntil, setPollUntil] = useState(() => Date.now() + 20 * 60_000);
  const isAwaiting = (o?: OrderDetail) => Boolean(o && o.status === "open" && (o.paymentStatus === "unpaid" || o.paymentStatus === "processing"));
  const orderQuery = useQuery({
    queryKey: ["order", id],
    queryFn: () => api<{ order: OrderDetail }>(`/orders/${id}`).then((r) => r.order),
    refetchInterval: (query) => (isAwaiting(query.state.data) && Date.now() < pollUntil ? 5_000 : false),
  });
  const order = orderQuery.data;
  const awaitingActivity = isAwaiting(order);

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["order", id] });
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    queryClient.invalidateQueries({ queryKey: ["overview"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["links"] });
    queryClient.invalidateQueries({ queryKey: ["settlements"] });
  };
  const onError = (title: string) => (error: unknown) => toast.show({ tone: "danger", title, description: error instanceof ApiError ? error.message : undefined });

  const createLink = useMutation({
    mutationFn: () => api(`/orders/${id}/links`, { method: "POST", body: { expiresInHours: Number(expiresInHours) } }),
    onSuccess: () => {
      refreshAll();
      setPollUntil(Date.now() + 20 * 60_000);
      toast.show({ tone: "success", title: "Payment link ready", description: "Copy it or share it on WhatsApp." });
    },
    onError: onError("Couldn't create the link"),
  });
  const disableLink = useMutation({
    mutationFn: (linkId: string) => api(`/links/${linkId}/disable`, { method: "POST" }),
    onSuccess: () => {
      setConfirmDisable(false);
      refreshAll();
      toast.show({ tone: "success", title: "Link disabled", description: "The checkout no longer accepts new payments. You can edit the order now." });
    },
    onError: onError("Couldn't disable the link"),
  });
  const cancelOrder = useMutation({
    mutationFn: () => api(`/orders/${id}/cancel`, { method: "POST" }),
    onSuccess: () => {
      setConfirmCancel(false);
      refreshAll();
      toast.show({ tone: "success", title: "Order cancelled" });
    },
    onError: onError("Couldn't cancel the order"),
  });
  const fulfil = useMutation({
    mutationFn: (status: "dispatched" | "delivered") => api(`/orders/${id}/fulfilment`, { method: "POST", body: { status, note: fulfilmentNote.trim() || null } }),
    onSuccess: (_, status) => {
      setFulfilmentNote("");
      refreshAll();
      toast.show({ tone: "success", title: status === "dispatched" ? "Marked as dispatched" : "Marked as delivered" });
    },
    onError: onError("Couldn't update fulfilment"),
  });

  if (orderQuery.isPending) return <PageSkeleton />;
  if (orderQuery.isError || !order) return <ErrorState error={orderQuery.error} onRetry={() => orderQuery.refetch()} />;

  const env = business.data?.environment;
  const activeLink = order.link;
  const safe = order.status === "cancelled" ? null : order.status === "draft" && order.paymentStatus === "unpaid" ? null : SAFE_TEXT[order.paymentStatus];
  const reviewItems = order.payments.filter((p) => p.status === "needs_review" || (p.status === "confirmed" && p.reviewReason && !p.resolution));

  return (
    <>
      <PageHeader
        back={{ href: "/dashboard/orders", label: "Orders" }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {order.reference}
            <StatusPill meta={orderPaymentMeta(order.paymentStatus, order.status)} />
            {order.paymentStatus === "paid" ? <StatusPill meta={FULFILMENT_STATUS[order.fulfilmentStatus]} /> : null}
          </span>
        }
        description={`Created ${formatDateTime(order.createdAt)}${order.customer ? ` · ${order.customer.name}` : ""}`}
        actions={
          <>
            {order.receiptAvailable && activeLink === null && order.links[0] ? (
              <ButtonLink href={`/pay/${order.links[0].id}/receipt`} target="_blank" variant="secondary" size="sm" icon={<FileText className="size-4" aria-hidden />}>
                Receipt
              </ButtonLink>
            ) : null}
            {order.editable ? (
              <ButtonLink href={`/dashboard/orders/${order.id}/edit`} variant="secondary" size="sm" icon={<Pencil className="size-4" aria-hidden />}>
                Edit
              </ButtonLink>
            ) : null}
            {order.canCancel ? (
              <Button variant="danger" size="sm" onClick={() => setConfirmCancel(true)} icon={<Ban className="size-4" aria-hidden />}>
                Cancel order
              </Button>
            ) : null}
          </>
        }
      />

      {safe ? (
        <Notice tone={safe.tone} title={safe.title} className="mb-6">
          {safe.body}
          {awaitingActivity ? (
            <button type="button" className="ml-1 font-semibold underline underline-offset-2" onClick={() => orderQuery.refetch()}>
              Refresh status
            </button>
          ) : null}
        </Notice>
      ) : null}
      {order.reviewRequired && order.paymentStatus === "paid" ? (
        <Notice tone="danger" title="This paid order also has a payment to review" className="mb-6">
          The order is paid, but another payment needs a decision. See the payments below.
        </Notice>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Items" />
            <div className="px-5 pb-5 sm:px-6 sm:pb-6">
              <ul className="divide-y divide-line">
                {order.items.map((item, index) => (
                  <li key={index} className="flex items-start justify-between gap-4 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-muted">
                        {item.quantity} × {formatNaira(item.unitPriceMinor)}
                      </p>
                    </div>
                    <p className="tabular font-semibold">{formatNaira(item.lineTotalMinor)}</p>
                  </li>
                ))}
              </ul>
              <dl className="mt-2 space-y-1.5 border-t border-line pt-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">Subtotal</dt>
                  <dd className="tabular">{formatNaira(order.subtotalMinor)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Delivery</dt>
                  <dd className="tabular">{formatNaira(order.deliveryFeeMinor)}</dd>
                </div>
                <div className="flex justify-between pt-1 text-base font-bold">
                  <dt>Total</dt>
                  <dd className="tabular">{formatNaira(order.totalMinor)}</dd>
                </div>
                {order.paymentStatus === "paid" ? (
                  <div className="flex justify-between text-success">
                    <dt className="font-medium">Verified paid</dt>
                    <dd className="tabular font-semibold">{formatNaira(order.amountPaidMinor)}</dd>
                  </div>
                ) : null}
              </dl>
              {order.note ? <p className="mt-4 rounded-xl bg-ivory/70 px-3 py-2.5 text-sm text-muted">Note: {order.note}</p> : null}
            </div>
          </Card>

          <Card>
            <CardHeader title="Payments" description="Each attempt a buyer starts appears here with its verified status." />
            <div className="px-5 pb-5 sm:px-6 sm:pb-6">
              {order.payments.length === 0 ? (
                <p className="py-4 text-sm text-muted">{activeLink ? "No payment started yet. When your customer opens the link and picks a method, it shows up here." : "Create a payment link to start collecting."}</p>
              ) : (
                <ul className="divide-y divide-line">
                  {order.payments.map((payment) => (
                    <PaymentRow key={payment.id} payment={payment} demoTools={Boolean(env?.payments.demoTools)} sandboxTools={Boolean(env?.payments.sandboxDepositSimulation)} onChanged={refreshAll} />
                  ))}
                </ul>
              )}
            </div>
          </Card>

          {reviewItems.length ? (
            <Card>
              <CardHeader title="Review" description="Decide what happens with payments that don't match the order. No refund is started automatically." />
              <div className="space-y-4 px-5 pb-5 sm:px-6 sm:pb-6">
                {reviewItems.map((payment) => (
                  <ReviewDecision key={payment.id} payment={payment} onDone={refreshAll} />
                ))}
              </div>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="History" />
            <div className="px-5 pb-5 sm:px-6 sm:pb-6">
              <Timeline events={order.events} />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <h2 className="text-base font-semibold">Payment link</h2>
            {activeLink ? (
              <div className="mt-4">
                <ShareLinkPanel
                  link={activeLink}
                  reference={order.reference}
                  totalMinor={order.totalMinor}
                  businessName={business.data?.business.name}
                  customerName={order.customer?.name}
                  customerPhone={order.customer?.phone}
                  onDisable={order.paymentStatus === "unpaid" ? () => setConfirmDisable(true) : undefined}
                  highlight={searchParams.get("share") === "1"}
                />
              </div>
            ) : order.canCreateLink ? (
              <div className="mt-3 space-y-3">
                <p className="text-sm text-muted">{order.status === "expired" ? "The last link expired without payment. Create a new one to try again." : "Create one link for this order and share it in the chat."}</p>
                <Field label="Expires after" htmlFor="link-expiry">
                  <Select id="link-expiry" value={expiresInHours} onChange={(e) => setExpiresInHours(e.target.value)}>
                    <option value="24">24 hours</option>
                    <option value="72">3 days</option>
                    <option value="168">7 days</option>
                  </Select>
                </Field>
                <Button className="w-full" onClick={() => createLink.mutate()} loading={createLink.isPending}>
                  Create payment link
                </Button>
              </div>
            ) : order.links[0] ? (
              <div className="mt-4">
                <ShareLinkPanel link={order.links[0]} reference={order.reference} totalMinor={order.totalMinor} />
                {order.receiptAvailable ? (
                  <ButtonLink href={`/pay/${order.links[0].id}/receipt`} target="_blank" variant="secondary" size="sm" className="mt-3 w-full" icon={<FileText className="size-4" aria-hidden />}>
                    View receipt
                  </ButtonLink>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted">This order is {order.status}.</p>
            )}
          </Card>

          {order.paymentStatus === "paid" ? (
            <Card className="p-5 sm:p-6">
              <h2 className="text-base font-semibold">Fulfilment</h2>
              <p className="mt-1 text-sm text-muted">
                {order.fulfilmentStatus === "unfulfilled" ? "Payment is verified. Record dispatch once the parcel leaves." : order.fulfilmentStatus === "dispatched" ? `Dispatched ${formatRelative(order.dispatchedAt)}.` : `Delivered ${formatRelative(order.deliveredAt)}.`}
              </p>
              {order.fulfilmentNote ? <p className="mt-2 text-sm">Note: {order.fulfilmentNote}</p> : null}
              {order.canFulfil ? (
                <div className="mt-4 space-y-3">
                  <Field label="Dispatch note" htmlFor="fulfilment-note" optional hint="e.g. rider name or tracking number">
                    <Input id="fulfilment-note" value={fulfilmentNote} maxLength={255} onChange={(e) => setFulfilmentNote(e.target.value)} />
                  </Field>
                  <div className="grid gap-2">
                    {order.fulfilmentStatus === "unfulfilled" ? (
                      <Button variant="dark" onClick={() => fulfil.mutate("dispatched")} loading={fulfil.isPending && fulfil.variables === "dispatched"} icon={<Truck className="size-4" aria-hidden />}>
                        Mark as dispatched
                      </Button>
                    ) : null}
                    <Button variant="secondary" onClick={() => fulfil.mutate("delivered")} loading={fulfil.isPending && fulfil.variables === "delivered"} icon={<PackageCheck className="size-4" aria-hidden />}>
                      Mark as delivered
                    </Button>
                  </div>
                </div>
              ) : null}
            </Card>
          ) : null}

          {order.customer ? (
            <Card className="p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">Customer</h2>
                <Link href={`/dashboard/customers/${order.customer.id}`} className="text-sm font-semibold text-ink underline-offset-2 hover:underline">
                  View
                </Link>
              </div>
              <dl className="mt-3 space-y-1.5 text-sm">
                <p className="font-medium">{order.customer.name}</p>
                {order.customer.phone ? <p className="text-muted">{order.customer.phone}</p> : null}
                {order.customer.email ? <p className="text-muted">{order.customer.email}</p> : null}
                {order.customer.handle ? <p className="text-muted">{order.customer.handle}</p> : null}
              </dl>
            </Card>
          ) : null}

          {order.settlements.length ? (
            <Card className="p-5 sm:p-6">
              <h2 className="text-base font-semibold">Settlement</h2>
              {order.settlements.map((s) => (
                <dl key={s.id} className="mt-3 divide-y divide-line text-sm">
                  <div className="flex justify-between py-2">
                    <dt className="text-muted">Paid by buyer</dt>
                    <dd className="tabular">{formatNaira(s.grossMinor)}</dd>
                  </div>
                  <div className="flex justify-between py-2">
                    <dt className="text-muted">Provider fees</dt>
                    <dd className="tabular">−{formatNaira(s.providerFeeMinor)}</dd>
                  </div>
                  <div className="flex justify-between py-2">
                    <dt className="text-muted">Bushustlers fee</dt>
                    <dd className="tabular">−{formatNaira(s.platformFeeMinor)}</dd>
                  </div>
                  <div className="flex justify-between py-2 font-semibold">
                    <dt>Net to you</dt>
                    <dd className="tabular">{formatNaira(s.netMinor)}</dd>
                  </div>
                  <div className="flex items-center justify-between pt-2.5">
                    <dt className="text-muted">Status</dt>
                    <dd>
                      <Pill tone={s.status === "settled" ? "success" : s.status === "failed" ? "danger" : "warning"}>{s.status === "pending" ? "Settlement pending" : s.status === "settled" ? "Settled" : "Settlement failed"}</Pill>
                    </dd>
                  </div>
                </dl>
              ))}
              <p className="mt-3 text-xs text-muted">Confirmed payment is not the same as money in your bank. <Link href="/dashboard/settlements" className="underline">About settlements</Link></p>
            </Card>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={() => cancelOrder.mutate()}
        loading={cancelOrder.isPending}
        tone="danger"
        title={`Cancel ${order.reference}?`}
        description="The payment link stops accepting payments. If a buyer still sends money to old instructions, it will be flagged for review, not lost."
        confirmLabel="Cancel order"
      />
      <ConfirmDialog
        open={confirmDisable}
        onClose={() => setConfirmDisable(false)}
        onConfirm={() => activeLink && disableLink.mutate(activeLink.id)}
        loading={disableLink.isPending}
        tone="danger"
        title="Disable this payment link?"
        description="Buyers can no longer start a payment with it. Any late money sent to existing instructions is flagged for review."
        confirmLabel="Disable link"
      />
    </>
  );
}

function PaymentRow({ payment, demoTools, sandboxTools, onChanged }: { payment: Transaction; demoTools: boolean; sandboxTools: boolean; onChanged: () => void }) {
  const toast = useToast();
  const open = payment.status === "awaiting_payment" || payment.status === "processing";
  const canDemo = demoTools && payment.provider === "demo" && open;
  const canSandbox = sandboxTools && payment.provider === "busha" && payment.providerMode === "sandbox" && payment.route === "bank_transfer" && open;
  const simulate = useMutation({
    mutationFn: (outcome: string) => api(`/transactions/${payment.id}/simulate`, { method: "POST", body: { outcome } }),
    onSuccess: () => {
      onChanged();
      toast.show({ tone: "success", title: "Simulated notification processed", description: "It went through signature checks, a provider lookup and reconciliation." });
    },
    onError: (error) => toast.show({ tone: "danger", title: "Simulation failed", description: error instanceof ApiError ? error.message : undefined }),
  });
  return (
    <li className="py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/dashboard/transactions/${payment.id}`} className="font-semibold hover:underline">
            {payment.routeLabel}
          </Link>
          <p className="text-sm text-muted">
            {payment.route === "stablecoin" && payment.assetAmount ? `${formatAsset(payment.assetAmount, payment.asset)} quoted · ` : ""}
            Started {formatRelative(payment.createdAt)}
            {payment.providerMode !== "production" ? ` · ${payment.providerMode}` : ""}
          </p>
          {payment.reviewReasonText ? <p className="mt-1 text-sm text-red-ink">{payment.reviewReasonText}</p> : null}
        </div>
        <div className="text-right">
          <StatusPill meta={ATTEMPT_STATUS[payment.status]} />
          <p className="tabular mt-1 text-sm font-semibold">{formatNaira(payment.receivedAmountMinor ?? payment.expectedAmountMinor)}</p>
        </div>
      </div>
      {canDemo || canSandbox ? (
        <div className="mt-3 rounded-xl border border-dashed border-amber-dot/60 bg-amber-tint/40 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-ink">
            <FlaskConical className="size-3.5" aria-hidden />
            {canDemo ? "Demo tools · simulates the buyer and provider" : "Busha sandbox · simulate deposit"}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => simulate.mutate("paid")} loading={simulate.isPending && simulate.variables === "paid"}>
              Buyer pays in full
            </Button>
            {canDemo ? (
              <>
                <Button size="sm" variant="secondary" onClick={() => simulate.mutate("underpaid")} loading={simulate.isPending && simulate.variables === "underpaid"}>
                  Pays short
                </Button>
                <Button size="sm" variant="secondary" onClick={() => simulate.mutate("processing")} loading={simulate.isPending && simulate.variables === "processing"}>
                  Payment detected
                </Button>
              </>
            ) : null}
            <Button size="sm" variant="ghost" onClick={() => simulate.mutate("failed")} loading={simulate.isPending && simulate.variables === "failed"}>
              Fails
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

export function ReviewDecision({ payment, onDone }: { payment: Transaction; onDone: () => void }) {
  const toast = useToast();
  const [note, setNote] = useState("");
  const [confirmAccept, setConfirmAccept] = useState(false);
  const resolve = useMutation({
    mutationFn: (decision: "accept" | "hold") => api(`/transactions/${payment.id}/resolve`, { method: "POST", body: { decision, note: note.trim() || undefined } }),
    onSuccess: (_, decision) => {
      setConfirmAccept(false);
      setNote("");
      onDone();
      toast.show({ tone: "success", title: decision === "accept" ? "Payment accepted" : "Kept on hold with your note" });
    },
    onError: (error) => toast.show({ tone: "danger", title: "Couldn't save the decision", description: error instanceof ApiError ? error.message : undefined }),
  });
  const received = payment.receivedAmountMinor;
  return (
    <div className="rounded-2xl border border-red-ink/20 bg-red-tint/40 p-4">
      <p className="font-semibold text-red-ink">{payment.reviewReasonText}</p>
      <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">Expected</dt>
          <dd className="tabular font-semibold">{formatNaira(payment.expectedAmountMinor)}</dd>
        </div>
        <div>
          <dt className="text-muted">Received</dt>
          <dd className="tabular font-semibold">
            {received ? formatNaira(received) : "Not reported yet"}
            {payment.route === "stablecoin" && payment.receivedAmount ? ` (${formatAsset(payment.receivedAmount, payment.receivedCurrency)})` : ""}
          </dd>
        </div>
      </dl>
      {payment.resolution?.note ? <p className="mt-2 text-sm text-muted">Your note: {payment.resolution.note}</p> : null}
      <Field label="Note" htmlFor={`note-${payment.id}`} optional className="mt-3">
        <Textarea id={`note-${payment.id}`} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Called Tolu, she will send the ₦5,000 balance" className="min-h-16" />
      </Field>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="dark" size="sm" onClick={() => setConfirmAccept(true)} disabled={!received && payment.status === "needs_review"}>
          Accept payment
        </Button>
        <Button variant="secondary" size="sm" onClick={() => resolve.mutate("hold")} loading={resolve.isPending && resolve.variables === "hold"}>
          Keep on hold
        </Button>
      </div>
      <ConfirmDialog
        open={confirmAccept}
        onClose={() => setConfirmAccept(false)}
        onConfirm={() => resolve.mutate("accept")}
        loading={resolve.isPending && resolve.variables === "accept"}
        title="Accept this payment?"
        description={`The order will count ${received ? formatNaira(received) : "the received amount"} as paid and a settlement record will be created. This is recorded in the order history.`}
        confirmLabel="Accept payment"
      />
    </div>
  );
}
