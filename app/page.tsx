import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Building2, CircleDollarSign, Coins, Globe2, Link2, MessageCircle, PackageCheck, ShieldCheck } from "lucide-react";
import { MarketingFooter, MarketingHeader } from "@/components/marketing";
import { ButtonLink, Pill } from "@/components/ui";
import { formatNaira, percentFromBps } from "@/lib/format";
import { getPublicConfig } from "@/lib/public-config";

const FAQ = [
  {
    q: "Do my buyers need an account?",
    a: "No. Your buyer opens the link, chooses bank transfer or a stablecoin wallet, and sees exactly what to pay. They don't sign up or download anything.",
  },
  {
    q: "How do I know a payment is real?",
    a: "An order only turns Paid when our server confirms the payment with the payment provider and the status, amount, currency and reference all match the order. A screenshot or a buyer clicking a button can never mark an order paid.",
  },
  {
    q: "What if a buyer sends the wrong amount?",
    a: "Short payments, overpayments, late payments and second payments are held for your review instead of being marked paid. You decide what happens next. Bushustlers doesn't start refunds automatically.",
  },
  {
    q: "When does the money reach my bank?",
    a: "A confirmed payment is not the same as money in your bank. Each confirmed payment gets a settlement record so you can see what is pending. During the pilot, payouts are not automated and we will agree settlement timing with each business. We don't promise instant settlement.",
  },
  {
    q: "Which payment methods are supported?",
    a: "Naira bank transfer to a one-time account for buyers in Nigeria, and USDT or USDC on supported networks for buyers abroad. Your checkout only shows the networks that are actually available. Card payments are not part of this release.",
  },
  {
    q: "Is Bushustlers live?",
    a: "Not yet. We are piloting on the Busha sandbox with a small group of sellers. Live payments will only be switched on once production access and the required checks are in place.",
  },
];

export default async function HomePage() {
  const config = await getPublicConfig();
  const { pricing } = config;
  const exampleNaira = 4500000n;
  const exampleNgnFee = (() => {
    const fee = (exampleNaira * BigInt(pricing.ngnBps) + 5000n) / 10000n;
    const cap = BigInt(pricing.ngnCapMinor);
    return cap > 0n && fee > cap ? cap : fee;
  })();
  const exampleStableFee = (exampleNaira * BigInt(pricing.stablecoinBps) + 5000n) / 10000n;

  return (
    <>
      <MarketingHeader />
      <main id="main">
        {/* Hero */}
        <section className="on-dark relative overflow-hidden bg-forest">
          <div className="absolute inset-0 hidden md:block" aria-hidden>
            <Image src="/brand/hero.webp" alt="" fill priority className="object-cover object-[70%_center]" sizes="100vw" />
            <div className="absolute inset-0 bg-gradient-to-r from-forest via-forest/85 to-forest/10" />
          </div>
          <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-32 sm:px-6 md:pb-28 md:pt-40">
            <div className="max-w-xl">
              <p className="inline-flex items-center gap-2 rounded-full bg-forest-2/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-mint">
                <span className="size-1.5 rounded-full bg-mint" aria-hidden />
                For Instagram and WhatsApp sellers
              </p>
              <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl">Your next sale, confirmed.</h1>
              <p className="mt-5 text-lg leading-relaxed text-on-dark">
                Create a payment link, accept supported local and international payments, and see exactly which orders are paid.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/sign-up" size="lg" icon={<Link2 className="size-5" aria-hidden />}>
                  Create a payment link
                </ButtonLink>
                <ButtonLink href="#how-it-works" size="lg" variant="mint-outline">
                  See how it works
                </ButtonLink>
              </div>
              <p className="mt-6 text-sm text-on-dark-muted">No setup fee. No monthly fee. Pilot on the Busha sandbox.</p>
            </div>
          </div>
          <div className="relative md:hidden">
            <Image src="/brand/hero.webp" alt="Small-business owner checking her phone beside clothing orders" width={1600} height={900} className="h-64 w-full object-cover object-[78%_center]" priority />
          </div>
        </section>

        {/* Product preview built from the real UI pieces */}
        <section className="bg-ivory py-16 sm:py-24" aria-labelledby="preview-title">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <h2 id="preview-title" className="text-3xl font-bold tracking-tight sm:text-4xl">One link per order. One status you can trust.</h2>
              <p className="mt-4 text-lg text-muted">Send a link. Confirm the payment. Fulfil the order. Everything about a sale lives in one place, not across chats and bank alerts.</p>
            </div>
            <div className="mt-10 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
              <div className="rounded-card border border-line/70 bg-paper p-5 shadow-card sm:p-6">
                <p className="text-sm font-semibold text-muted">Your orders</p>
                <ul className="mt-3 divide-y divide-line">
                  {[
                    { ref: "AMK-104", who: "Tolu A. · Linen two-piece set", total: "4500000", pill: <Pill tone="success">Paid</Pill>, sub: <Pill tone="neutral">Not dispatched</Pill> },
                    { ref: "AMK-105", who: "Ngozi O. · Adire kaftan", total: "3800000", pill: <Pill tone="warning">Awaiting payment</Pill>, sub: null },
                    { ref: "AMK-106", who: "Chiamaka E. · Silk scarf set", total: "2750000", pill: <Pill tone="danger">Needs review</Pill>, sub: null },
                  ].map((row) => (
                    <li key={row.ref} className="flex items-center justify-between gap-3 py-3.5">
                      <div className="min-w-0">
                        <p className="font-semibold">{row.ref}</p>
                        <p className="truncate text-sm text-muted">{row.who}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span className="tabular font-semibold">{formatNaira(row.total)}</span>
                        <div className="flex gap-1">{row.pill}{row.sub}</div>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-muted">Example data. Paid and dispatched are tracked as separate steps.</p>
              </div>
              <div className="on-dark rounded-card bg-forest p-6 text-white shadow-card">
                <p className="text-sm text-on-dark-muted">Pay</p>
                <p className="text-xl font-bold">Amaka Clothing</p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-mint">Order AMK-104</p>
                <p className="tabular text-4xl font-bold tracking-tight">{formatNaira("4500000")}</p>
                <div className="mt-5 space-y-2.5">
                  <div className="flex items-center gap-3 rounded-2xl bg-forest-2 p-3.5">
                    <span className="grid size-9 place-items-center rounded-xl bg-mint-tint text-forest"><Building2 className="size-5" aria-hidden /></span>
                    <div>
                      <p className="font-semibold">Bank transfer</p>
                      <p className="text-sm text-on-dark-muted">Pay in naira to a one-time account</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl bg-forest-2 p-3.5">
                    <span className="grid size-9 place-items-center rounded-xl bg-mint-tint text-forest"><Coins className="size-5" aria-hidden /></span>
                    <div>
                      <p className="font-semibold">Stablecoin wallet</p>
                      <p className="text-sm text-on-dark-muted">Exact asset, network and quoted amount</p>
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-xs text-on-dark-muted">Guest checkout. No buyer account needed.</p>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-20 bg-paper py-16 sm:py-24" aria-labelledby="how-title">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 id="how-title" className="text-3xl font-bold tracking-tight sm:text-4xl">How it works</h2>
            <ol className="mt-10 grid gap-5 md:grid-cols-3">
              {[
                { icon: <Link2 className="size-5" aria-hidden />, title: "Create the order", body: "Add the customer, items and price. Bushustlers calculates the total and creates one link for that order." },
                { icon: <MessageCircle className="size-5" aria-hidden />, title: "Share the link in the chat", body: "Copy it or send it straight to WhatsApp. The buyer pays by naira transfer or from a stablecoin wallet." },
                { icon: <PackageCheck className="size-5" aria-hidden />, title: "Ship when it says Paid", body: "The order turns Paid only after the provider confirms the money. Then you record dispatch." },
              ].map((step, index) => (
                <li key={step.title} className="rounded-card border border-line/70 bg-ivory/60 p-6">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-full bg-forest text-sm font-bold text-mint">{index + 1}</span>
                    <span className="text-forest">{step.icon}</span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-muted">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Local and international */}
        <section className="bg-ivory py-16 sm:py-24" aria-labelledby="buyers-title">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:items-center">
            <div>
              <h2 id="buyers-title" className="text-3xl font-bold tracking-tight sm:text-4xl">Buyers down the road or in London</h2>
              <p className="mt-4 text-lg text-muted">The same link works for local and overseas customers, with the payment method that suits each of them.</p>
              <div className="mt-8 space-y-4">
                <div className="flex gap-4 rounded-card bg-paper p-5 shadow-card">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-mint-tint text-forest"><Building2 className="size-5" aria-hidden /></span>
                  <div>
                    <h3 className="font-semibold">Buyers in Nigeria</h3>
                    <p className="mt-1 text-muted">Pay in naira from any bank app to a one-time account created for that order, so the payment is matched without anyone checking alerts by hand.</p>
                  </div>
                </div>
                <div className="flex gap-4 rounded-card bg-paper p-5 shadow-card">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-mint-tint text-forest"><Globe2 className="size-5" aria-hidden /></span>
                  <div>
                    <h3 className="font-semibold">Buyers abroad</h3>
                    <p className="mt-1 text-muted">Pay with USDT or USDC on a supported network. The checkout shows the exact asset, network, amount, address and quote expiry, with a clear network warning.</p>
                  </div>
                </div>
              </div>
            </div>
            <Image src="/brand/support.webp" alt="Seller and supplier reviewing packaged fabric orders" width={1200} height={800} className="w-full rounded-card object-cover shadow-card" />
          </div>
        </section>

        {/* Trust */}
        <section className="on-dark bg-forest py-16 text-white sm:py-24" aria-labelledby="trust-title">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 id="trust-title" className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">It also tells you when not to ship</h2>
            <div className="mt-8 flex flex-wrap gap-2">
              <Pill tone="warning">Don&apos;t ship yet</Pill>
              <Pill tone="danger">Hold for review</Pill>
              <Pill tone="success">Safe to ship</Pill>
            </div>
            <ul className="mt-10 grid gap-x-10 gap-y-5 md:grid-cols-2">
              {[
                "Only our server can mark an order Paid. A screenshot can't.",
                "Status, amount, currency and reference must all match the order.",
                "A repeated payment notification is counted once, never twice.",
                "Short, extra and late payments are held for review, not shipped.",
                "A second payment for the same order is recorded and flagged, not lost.",
                "Paid and dispatched are tracked as separate steps.",
              ].map((rule) => (
                <li key={rule} className="flex gap-3 text-on-dark">
                  <BadgeCheck className="mt-0.5 size-5 shrink-0 text-mint" aria-hidden />
                  {rule}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-20 bg-ivory py-16 sm:py-24" aria-labelledby="pricing-title">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-2xl">
                <h2 id="pricing-title" className="text-3xl font-bold tracking-tight sm:text-4xl">We earn only when you get paid</h2>
                <p className="mt-4 text-lg text-muted">Fees are paid by the business and deducted from settlement. Your buyer pays the order total.</p>
              </div>
              <Pill tone="warning">Proposed pricing for the pilot</Pill>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              <div className="rounded-card border border-line/70 bg-paper p-6 shadow-card">
                <CircleDollarSign className="size-6 text-forest" aria-hidden />
                <p className="mt-4 text-4xl font-bold tracking-tight">{formatNaira(pricing.setupFeeMinor)}</p>
                <p className="mt-2 font-semibold">To start</p>
                <p className="mt-1 text-muted">No setup fee and no monthly fee.</p>
              </div>
              <div className="rounded-card border border-line/70 bg-paper p-6 shadow-card">
                <Building2 className="size-6 text-forest" aria-hidden />
                <p className="mt-4 text-4xl font-bold tracking-tight">{percentFromBps(pricing.ngnBps)}</p>
                <p className="mt-2 font-semibold">Per verified naira payment</p>
                <p className="mt-1 text-muted">Capped at {formatNaira(pricing.ngnCapMinor)} per payment. On a {formatNaira(exampleNaira.toString())} order that&apos;s {formatNaira(exampleNgnFee.toString())}.</p>
              </div>
              <div className="rounded-card border border-line/70 bg-paper p-6 shadow-card">
                <Coins className="size-6 text-forest" aria-hidden />
                <p className="mt-4 text-4xl font-bold tracking-tight">{percentFromBps(pricing.stablecoinBps)}</p>
                <p className="mt-2 font-semibold">Per stablecoin checkout</p>
                <p className="mt-1 text-muted">On a {formatNaira(exampleNaira.toString())} order that&apos;s {formatNaira(exampleStableFee.toString())}.</p>
              </div>
            </div>
            <p className="mt-6 max-w-3xl text-sm text-muted">
              Fees are charged only on payments Bushustlers verifies. Payment provider charges (such as a bank-transfer gateway fee or the conversion rate in a stablecoin quote) are shown separately on each payment. A buyer&apos;s own bank or wallet may charge its usual transfer or network fee.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 bg-paper py-16 sm:py-24" aria-labelledby="faq-title">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 id="faq-title" className="text-3xl font-bold tracking-tight sm:text-4xl">Questions sellers ask</h2>
            <div className="mt-8 divide-y divide-line rounded-card border border-line/70">
              {FAQ.map((item) => (
                <details key={item.q} className="group px-5 py-4 sm:px-6">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                    {item.q}
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-bubble text-lg leading-none transition-transform group-open:rotate-45" aria-hidden>
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-muted">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-ivory py-16">
          <div className="on-dark mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 rounded-card bg-forest px-6 py-10 sm:px-10 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-bold text-white sm:text-3xl">Ready for your next order?</h2>
              <p className="mt-2 flex items-center gap-2 text-on-dark">
                <ShieldCheck className="size-5 text-mint" aria-hidden />
                Paid means verified, not a screenshot.
              </p>
            </div>
            <ButtonLink href="/sign-up" size="lg">
              Create a payment link <ArrowRight className="size-5" aria-hidden />
            </ButtonLink>
          </div>
          <p className="mt-6 text-center text-sm text-muted">
            Already selling with us? <Link href="/sign-in" className="font-semibold text-ink underline-offset-2 hover:underline">Sign in</Link>
          </p>
        </section>
      </main>
      <MarketingFooter supportEmail={config.supportEmail} />
    </>
  );
}
