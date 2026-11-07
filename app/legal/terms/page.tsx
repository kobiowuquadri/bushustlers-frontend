import type { Metadata } from "next";
import { LegalPage } from "../legal-page";

export const metadata: Metadata = { title: "Terms of service (draft)" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of service" updated="7 November 2026">
      <section>
        <h2>What Bushustlers does</h2>
        <p>Bushustlers lets a business create an order, share a payment link and see whether the payment has been confirmed by the payment provider. Payments are collected through Busha. Bushustlers is not a bank and does not hold deposits on your behalf.</p>
      </section>
      <section>
        <h2>Pilot status</h2>
        <p>The service is in a pilot. During the pilot it may run in demo or sandbox mode, where no real money moves. Features, pricing and availability may change.</p>
      </section>
      <section>
        <h2>Payment confirmation</h2>
        <ul>
          <li>An order is shown as paid only after the provider confirms the payment and the amount, currency and reference match.</li>
          <li>Payments that do not match are held for your review. You decide whether to accept them. Bushustlers does not start refunds automatically.</li>
          <li>A confirmed payment is not the same as money in your bank. Settlement status is shown separately.</li>
        </ul>
      </section>
      <section>
        <h2>Fees</h2>
        <p>Proposed pilot pricing: no setup or monthly fee; 1% per verified naira payment, capped at ₦1,000; 1.5% per stablecoin checkout. Fees are deducted from settlement and are not added to the buyer&apos;s total.</p>
      </section>
      <section>
        <h2>Your responsibilities</h2>
        <ul>
          <li>Sell only lawful goods and services and describe them accurately.</li>
          <li>Keep your account credentials secure.</li>
          <li>Fulfil orders that are confirmed as paid, and resolve disputes with your customers.</li>
        </ul>
      </section>
    </LegalPage>
  );
}
