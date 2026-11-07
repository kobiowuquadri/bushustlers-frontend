"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Building2, CheckCircle2, ChevronDown, Clock, Coins, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { api, ApiError, newIdempotencyKey } from "@/lib/api";
import { useBoundedPolling, useNow } from "@/lib/hooks";
import { formatAsset, formatCountdown, formatDateTime, formatNaira, formatRelative } from "@/lib/format";
import type { BankInstructions, BuyerPayment, Checkout, StablecoinInstructions } from "@/lib/types";
import { LogoOnPanel } from "@/components/brand";
import { QrCodeImage } from "@/components/share-link";
import { Button, ButtonLink, Card, cn, CopyButton, ErrorState, Field, Input, Notice, Pill } from "@/components/ui";

const ACTIVE = new Set(["creating", "awaiting_payment", "processing"]);

export function CheckoutView() {
  const { linkId } = useParams<{ linkId: string }>();
  const queryClient = useQueryClient();
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [providerDown, setProviderDown] = useState<string | null>(null);

  const checkoutQuery = useQuery({
    queryKey: ["checkout", linkId],
    queryFn: () => api<{ checkout: Checkout }>(`/checkout/${linkId}`).then((r) => r.checkout),
    refetchInterval: () => poll,
    refetchOnWindowFocus: true,
  });
  const checkout = checkoutQuery.data;

  // The payment to show: the one the buyer just started, otherwise the most recent one still in progress
  const current: BuyerPayment | null = useMemo(() => {
    if (!checkout) return null;
    if (selectedPaymentId) return checkout.payments.find((p) => p.id === selectedPaymentId) ?? null;
    return checkout.payments.find((p) => ACTIVE.has(p.status) || p.status === "needs_review") ?? null;
  }, [checkout, selectedPaymentId]);

  const paid = checkout?.order.paymentStatus === "paid";
  const inProgress = Boolean(current && ACTIVE.has(current.status)) && !paid;
  const poll = useBoundedPolling(inProgress, 4_000, 30 * 60_000);

  const setCheckout = (next: Checkout) => queryClient.setQueryData(["checkout", linkId], next);

  if (checkoutQuery.isPending) {
    return (
      <Shell>
        <div className="grid place-items-center py-24">
          <Loader2 className="size-6 animate-spin text-muted" aria-label="Loading checkout" />
        </div>
      </Shell>
    );
  }
  if (checkoutQuery.isError || !checkout) {
    return (
      <Shell>
        <Card>
          <ErrorState error={checkoutQuery.error} onRetry={checkoutQuery.error instanceof ApiError && checkoutQuery.error.status === 404 ? undefined : () => checkoutQuery.refetch()} />
        </Card>
      </Shell>
    );
  }

  const linkClosed = checkout.link.status === "expired" || checkout.link.status === "disabled" || checkout.order.cancelled;
  const showPicker = !paid && !linkClosed && (choosing || !current || ["failed", "expired", "cancelled"].includes(current.status));

  return (
    <Shell mode={checkout.mode}>
      <OrderSummary checkout={checkout} />

      {checkout.mode === "demo" ? (
        <Notice tone="warning" title="Demo checkout" className="mt-4">
          This is a demonstration. Payment details shown here are not real and no money should be sent.
        </Notice>
      ) : checkout.mode === "sandbox" ? (
        <Notice tone="info" title="Test checkout (Busha sandbox)" className="mt-4">
          Use sandbox test funds only. Do not send real money.
        </Notice>
      ) : null}

      <div className="mt-4">
        {paid ? (
          <PaidPanel checkout={checkout} />
        ) : linkClosed ? (
          <Card className="p-6 text-center">
            <Clock className="mx-auto size-8 text-muted" aria-hidden />
            <h2 className="mt-3 text-lg font-semibold">{checkout.order.cancelled ? "This order was cancelled" : checkout.link.status === "expired" ? "This payment link has expired" : "This payment link is no longer active"}</h2>
            <p className="mt-1.5 text-sm text-muted">Please ask {checkout.merchant.name} for a new link. If you already sent money, keep your receipt and contact the seller; late payments are still recorded for review.</p>
          </Card>
        ) : showPicker ? (
          <MethodPicker
            checkout={checkout}
            linkId={linkId}
            previous={current}
            onStarted={(payment, next) => {
              setProviderDown(null);
              setSelectedPaymentId(payment.id);
              setChoosing(false);
              setCheckout(next);
            }}
            onProviderDown={setProviderDown}
            providerDown={providerDown}
            onCancel={current && ACTIVE.has(current.status) ? () => setChoosing(false) : undefined}
          />
        ) : current ? (
          <PaymentPanel
            payment={current}
            checkout={checkout}
            linkId={linkId}
            polling={Boolean(poll)}
            onUpdated={setCheckout}
            onChangeMethod={() => setChoosing(true)}
          />
        ) : null}
      </div>

      <p className="mt-8 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
        <ShieldCheck className="size-4" aria-hidden />
        Payment status is confirmed by the payment provider, never by a screenshot.
      </p>
    </Shell>
  );
}

function Shell({ children, mode }: { children: React.ReactNode; mode?: string }) {
  return (
    <div className="min-h-screen bg-ivory">
      <header className="mx-auto flex max-w-xl items-center justify-between px-4 pt-5">
        <LogoOnPanel height={20} />
        {mode && mode !== "production" ? <Pill tone={mode === "demo" ? "warning" : "info"}>{mode === "demo" ? "Demo" : "Sandbox"}</Pill> : null}
      </header>
      <main className="mx-auto max-w-xl px-4 pb-12 pt-5">{children}</main>
    </div>
  );
}

function OrderSummary({ checkout }: { checkout: Checkout }) {
  const [open, setOpen] = useState(false);
  const { order } = checkout;
  return (
    <section className="on-dark overflow-hidden rounded-card bg-forest text-white shadow-card" aria-labelledby="pay-title">
      <div className="relative p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full border-[18px] border-mint/10" aria-hidden />
        <p className="text-sm font-medium text-on-dark-muted">Pay</p>
        <h1 id="pay-title" className="text-2xl font-bold tracking-tight">
          {checkout.merchant.name}
        </h1>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-mint">Order {order.reference}</p>
        <p className="tabular mt-1 text-4xl font-bold tracking-tight sm:text-[44px]">{formatNaira(order.totalMinor)}</p>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-on-dark hover:text-white">
          {order.items.length === 1 ? order.items[0].name : `${order.items.length} items`}
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
        </button>
      </div>
      {open ? (
        <dl className="border-t border-hair-dark bg-forest-2/60 px-6 py-4 text-sm">
          {order.items.map((item, index) => (
            <div key={index} className="flex justify-between gap-4 py-1">
              <dt className="text-on-dark">
                {item.quantity} × {item.name}
              </dt>
              <dd className="tabular">{formatNaira(item.lineTotalMinor)}</dd>
            </div>
          ))}
          {order.deliveryFeeMinor !== "0" ? (
            <div className="flex justify-between gap-4 py-1">
              <dt className="text-on-dark">Delivery</dt>
              <dd className="tabular">{formatNaira(order.deliveryFeeMinor)}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </section>
  );
}

function MethodPicker({
  checkout,
  linkId,
  previous,
  onStarted,
  onProviderDown,
  providerDown,
  onCancel,
}: {
  checkout: Checkout;
  linkId: string;
  previous: BuyerPayment | null;
  onStarted: (payment: BuyerPayment, checkout: Checkout) => void;
  onProviderDown: (message: string | null) => void;
  providerDown: string | null;
  onCancel?: () => void;
}) {
  const { bankTransfer, stablecoin } = checkout.methods;
  const [route, setRoute] = useState<"bank_transfer" | "stablecoin" | null>(bankTransfer.available ? null : stablecoin.available ? "stablecoin" : null);
  const [option, setOption] = useState(stablecoin.options[0] ? `${stablecoin.options[0].asset}:${stablecoin.options[0].network}` : "");
  const [email, setEmail] = useState(checkout.order.buyerEmail ?? "");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  // One key per intended payment: retries of the same request can never create a second payment
  const [key, setKey] = useState(newIdempotencyKey);

  const start = useMutation({
    mutationFn: () => {
      const [asset, network] = option.split(":");
      const body = route === "stablecoin" ? { route, asset, network, email: email.trim() || undefined, name: name.trim() || undefined } : { route };
      return api<{ payment: BuyerPayment; checkout: Checkout }>(`/checkout/${linkId}/payments`, { method: "POST", body, headers: { "Idempotency-Key": key } });
    },
    onSuccess: (data) => onStarted(data.payment, data.checkout),
    onError: (err) => {
      setKey(newIdempotencyKey());
      if (err instanceof ApiError && (err.code === "provider_unavailable" || err.code === "provider_rejected" || err.isNetwork)) {
        onProviderDown(err.message);
      } else {
        setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      }
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!route) return setError("Choose how you'd like to pay.");
    if (route === "stablecoin" && !email.trim()) return setError("Enter your email address for a stablecoin payment.");
    start.mutate();
  };

  if (!bankTransfer.available && !stablecoin.available) {
    return <Notice tone="warning" title="Payments are temporarily unavailable">Please try again later or contact {checkout.merchant.name}.</Notice>;
  }

  return (
    <Card className="p-5 sm:p-6">
      <form onSubmit={submit} noValidate>
        {previous && ["failed", "expired", "cancelled"].includes(previous.status) ? (
          <Notice tone={previous.status === "failed" ? "danger" : "warning"} className="mb-4">
            {previous.statusText}
          </Notice>
        ) : null}
        {providerDown ? (
          <Notice tone="warning" title="Payment provider temporarily unavailable" className="mb-4">
            {providerDown} Nothing was charged.
          </Notice>
        ) : null}
        <fieldset>
          <legend className="text-lg font-semibold">How would you like to pay?</legend>
          <div className="mt-4 grid gap-3">
            {bankTransfer.available ? (
              <MethodOption checked={route === "bank_transfer"} onSelect={() => setRoute("bank_transfer")} icon={<Building2 className="size-5" aria-hidden />} title="Bank transfer" description="Pay in naira from any Nigerian bank app. You'll get a one-time account number." />
            ) : null}
            {stablecoin.available ? (
              <MethodOption checked={route === "stablecoin"} onSelect={() => setRoute("stablecoin")} icon={<Coins className="size-5" aria-hidden />} title="Stablecoin wallet" description="Pay from abroad with USDT or USDC. You'll see the exact amount, network and address." />
            ) : null}
          </div>
        </fieldset>

        {route === "stablecoin" ? (
          <div className="mt-5 space-y-4 rounded-2xl bg-ivory/70 p-4">
            <fieldset>
              <legend className="text-sm font-semibold">Asset and network</legend>
              <div className="mt-2 grid gap-2">
                {stablecoin.options.map((o) => {
                  const value = `${o.asset}:${o.network}`;
                  return (
                    <label key={value} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border bg-paper px-3.5 py-3 text-sm", option === value ? "border-forest ring-1 ring-forest" : "border-line hover:border-forest/40")}>
                      <input type="radio" name="stablecoin" value={value} checked={option === value} onChange={() => setOption(value)} className="size-4 accent-[#08281F]" />
                      <span className="font-semibold">{o.asset}</span>
                      <span className="text-muted">on {o.networkLabel}</span>
                    </label>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-muted">Only send on the network you choose here. Your wallet must support it.</p>
            </fieldset>
            <Field label="Email for your receipt" htmlFor="buyer-email" hint="Required by the payment provider for stablecoin payments.">
              <Input id="buyer-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </Field>
            <Field label="Your name" htmlFor="buyer-name" optional>
              <Input id="buyer-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
          </div>
        ) : null}

        {error ? <Notice tone="danger" className="mt-4">{error}</Notice> : null}

        <div className="mt-5 flex flex-col gap-2">
          <Button type="submit" size="lg" loading={start.isPending} disabled={!route}>
            {route === "stablecoin" ? "Get payment address" : route === "bank_transfer" ? "Get account details" : "Continue"}
          </Button>
          {onCancel ? (
            <Button variant="ghost" onClick={onCancel}>
              Back to my current payment
            </Button>
          ) : null}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-muted">
          You pay the order total shown above. Bushustlers fees are paid by the seller. Your own bank or wallet may charge its usual transfer or network fee.
        </p>
      </form>
    </Card>
  );
}

function MethodOption({ checked, onSelect, icon, title, description }: { checked: boolean; onSelect: () => void; icon: React.ReactNode; title: string; description: string }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3.5 rounded-2xl border bg-paper p-4 transition-colors", checked ? "border-forest ring-1 ring-forest" : "border-line hover:border-forest/40")}>
      <input type="radio" name="method" checked={checked} onChange={onSelect} className="mt-1 size-4 accent-[#08281F]" />
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-mint-tint text-forest">{icon}</span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="mt-0.5 block text-sm text-muted">{description}</span>
      </span>
    </label>
  );
}

function PaymentPanel({ payment, checkout, linkId, polling, onUpdated, onChangeMethod }: { payment: BuyerPayment; checkout: Checkout; linkId: string; polling: boolean; onUpdated: (checkout: Checkout) => void; onChangeMethod: () => void }) {
  const now = useNow();
  const [noticeState, setNotice] = useState<{ tone: "warning" | "info"; text: string; status?: string } | null>(null);
  // A notice only applies to the status it was written for
  const notice = noticeState && (!noticeState.status || noticeState.status === payment.status) ? noticeState : null;
  const [cooldownUntil, setCooldownUntil] = useState(0);

  const refresh = useMutation({
    mutationFn: () => api<{ payment: BuyerPayment; checkout: Checkout }>(`/checkout/${linkId}/payments/${payment.id}/refresh`, { method: "POST" }),
    onMutate: () => setCooldownUntil(Date.now() + 10_000),
    onSuccess: (data) => {
      onUpdated(data.checkout);
      setNotice(data.payment.status === payment.status && ACTIVE.has(data.payment.status) ? { tone: "info", text: "No change yet. The provider hasn't reported this payment.", status: payment.status } : null);
    },
    onError: (err) => setNotice({ tone: "warning", text: err instanceof ApiError ? err.message : "Couldn't check right now. Please try again shortly.", status: payment.status }),
  });

  const instructions = payment.instructions;
  const expiresAt = instructions?.kind === "stablecoin" ? instructions.quoteExpiresAt : instructions?.expiresAt ?? payment.expiresAt;
  const countdown = formatCountdown(expiresAt, now);
  const coolingDown = now < cooldownUntil;

  if (payment.status === "needs_review") {
    return (
      <Card className="p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-6 shrink-0 text-amber-ink" aria-hidden />
          <div>
            <h2 className="text-lg font-semibold">Payment received, under review</h2>
            <p className="mt-1.5 text-sm text-muted">{payment.statusText}</p>
            <p className="mt-3 text-sm text-muted">Reference for the seller: <span className="font-mono text-ink">{checkout.order.reference}</span></p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          {payment.status === "processing" ? <Loader2 className="size-5 animate-spin text-sky-ink" aria-hidden /> : <span className="size-2.5 animate-pulse rounded-full bg-amber-dot" aria-hidden />}
          <p className="text-sm font-semibold" role="status" aria-live="polite">
            {payment.statusText}
          </p>
        </div>
        {countdown && payment.status === "awaiting_payment" ? (
          <p className="tabular text-sm text-muted">
            Expires in <span className="font-semibold text-ink">{countdown}</span>
          </p>
        ) : null}
      </div>

      <div className="p-5 sm:p-6">
        {payment.status === "creating" || !instructions ? (
          <div className="flex items-center gap-3 py-6 text-sm text-muted">
            <Loader2 className="size-5 animate-spin" aria-hidden />
            Getting your payment details from the provider…
          </div>
        ) : instructions.kind === "bank_transfer" ? (
          <BankDetails instructions={instructions} reference={checkout.order.reference} />
        ) : (
          <StablecoinDetails instructions={instructions} payment={payment} />
        )}

        {notice ? <Notice tone={notice.tone} className="mt-5">{notice.text}</Notice> : null}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button variant="dark" className="flex-1" onClick={() => refresh.mutate()} loading={refresh.isPending} disabled={coolingDown && !refresh.isPending} icon={<RefreshCw className="size-4" aria-hidden />}>
            I&apos;ve paid — check payment status
          </Button>
          <Button variant="secondary" onClick={onChangeMethod} icon={<ArrowLeft className="size-4" aria-hidden />}>
            Change method
          </Button>
        </div>
        <p className="mt-3 text-center text-xs text-muted">
          {polling ? "This page updates automatically when the provider confirms your payment." : "Automatic updates paused. Use the button above to check again."}
          {payment.lastCheckedAt ? ` Last checked ${formatRelative(payment.lastCheckedAt)}.` : ""}
        </p>
      </div>
    </Card>
  );
}

function DetailRow({ label, value, copy, mono, large }: { label: string; value: string; copy?: string; mono?: boolean; large?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
        <p className={cn("mt-0.5 break-all font-semibold text-ink", mono && "font-mono", large ? "text-2xl tracking-tight" : "text-base")}>{value}</p>
      </div>
      {copy ? <CopyButton value={copy} label="Copy" /> : null}
    </div>
  );
}

function BankDetails({ instructions, reference }: { instructions: BankInstructions; reference: string }) {
  const amountMinor = (() => {
    const [whole, fraction = ""] = instructions.amount.split(".");
    return (BigInt(whole) * 100n + BigInt((fraction + "00").slice(0, 2))).toString();
  })();
  return (
    <div>
      <h2 className="text-lg font-semibold">Transfer exactly {formatNaira(amountMinor)}</h2>
      <p className="mt-1 text-sm text-muted">Send one transfer for the full amount to this one-time account. It is only for order {reference}.</p>
      {instructions.demo ? (
        <Notice tone="warning" className="mt-4">
          Demo details: this is not a real bank account. Do not send money.
        </Notice>
      ) : null}
      <div className="mt-4 divide-y divide-line rounded-2xl border border-line px-4">
        <DetailRow label="Amount" value={formatNaira(amountMinor)} copy={instructions.amount} large />
        <DetailRow label="Account number" value={instructions.accountNumber} copy={instructions.accountNumber} mono />
        <DetailRow label="Bank" value={instructions.bankName} />
        {instructions.accountName ? <DetailRow label="Account name" value={instructions.accountName} /> : null}
      </div>
      <ul className="mt-4 space-y-1.5 text-sm text-muted">
        <li>• Sending less or more than {formatNaira(amountMinor)} puts the order on hold for the seller to review.</li>
        <li>• Your bank may charge its usual transfer fee. Bushustlers fees are paid by the seller.</li>
        <li>• Don&apos;t send a screenshot as proof: the seller sees the confirmation here automatically.</li>
      </ul>
    </div>
  );
}

function StablecoinDetails({ instructions, payment }: { instructions: StablecoinInstructions; payment: BuyerPayment }) {
  const [showQr, setShowQr] = useState(false);
  return (
    <div>
      <h2 className="text-lg font-semibold">
        Send {formatAsset(instructions.amount, instructions.asset)} on {instructions.networkLabel}
      </h2>
      <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-red-tint px-3.5 py-3 text-sm text-red-ink">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>
          Send only <strong>{instructions.asset}</strong> on the <strong>{instructions.networkLabel}</strong> network. Funds sent with another asset or network may be lost.
        </p>
      </div>
      {instructions.demo ? (
        <Notice tone="warning" className="mt-3">
          Demo details: this address is not a real wallet and the rate is a demo rate, not a market quote. Do not send funds.
        </Notice>
      ) : null}
      <div className="mt-4 divide-y divide-line rounded-2xl border border-line px-4">
        <DetailRow label="Amount" value={formatAsset(instructions.amount, instructions.asset)} copy={instructions.amount} large />
        <DetailRow label="Network" value={instructions.networkLabel} />
        <DetailRow label="Address" value={instructions.address} copy={instructions.address} mono />
        {instructions.memo ? <DetailRow label="Memo / tag (required)" value={instructions.memo} copy={instructions.memo} mono /> : null}
      </div>
      <div className="mt-3">
        <Button variant="ghost" size="sm" onClick={() => setShowQr((v) => !v)} aria-expanded={showQr}>
          {showQr ? "Hide address QR code" : "Show address QR code"}
        </Button>
        {showQr ? (
          <div className="mt-2 flex justify-center">
            <QrCodeImage value={instructions.address} label={`QR code for the ${instructions.asset} payment address`} />
          </div>
        ) : null}
      </div>
      <dl className="mt-4 space-y-1.5 text-sm">
        {instructions.rateExplained || instructions.rate ? (
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{instructions.rateSource === "demo" ? "Demo rate" : "Rate (provider quote)"}</dt>
            <dd className="text-right font-medium">{instructions.rateExplained || instructions.rate}</dd>
          </div>
        ) : null}
        {instructions.quoteExpiresAt ? (
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Quote valid until</dt>
            <dd className="text-right font-medium">{formatDateTime(instructions.quoteExpiresAt)}</dd>
          </div>
        ) : null}
        {payment.providerFees.map((fee) => (
          <div key={fee.name} className="flex justify-between gap-4">
            <dt className="text-muted">{fee.name}</dt>
            <dd className="text-right font-medium">{formatAsset(fee.amount, fee.currency)}</dd>
          </div>
        ))}
      </dl>
      <ul className="mt-4 space-y-1.5 text-sm text-muted">
        <li>• The amount includes conversion at the quoted rate. Your wallet charges its own network fee on top.</li>
        <li>• Paying after the quote expires may be converted at a different rate; the seller reviews late payments.</li>
      </ul>
    </div>
  );
}

function PaidPanel({ checkout }: { checkout: Checkout }) {
  return (
    <Card className="p-6 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-mint-tint text-success">
        <CheckCircle2 className="size-8" aria-hidden />
      </span>
      <h2 className="mt-4 text-xl font-bold">Payment confirmed</h2>
      <p className="mt-1.5 text-sm text-muted">
        {checkout.merchant.name} has been notified that order {checkout.order.reference} is paid
        {checkout.order.paidAt ? ` (${formatDateTime(checkout.order.paidAt)})` : ""}.
      </p>
      <ButtonLink href={`/pay/${checkout.link.id}/receipt`} className="mt-5" variant="dark">
        View receipt
      </ButtonLink>
      <p className="mt-4 text-xs text-muted">
        Questions about delivery? Contact {checkout.merchant.name} directly. <Link href="/" className="underline">About Bushustlers</Link>
      </p>
    </Card>
  );
}
