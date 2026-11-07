import type { Metadata } from "next";
import { LegalPage } from "../legal-page";

export const metadata: Metadata = { title: "Privacy notice (draft)" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy notice" updated="7 November 2026">
      <section>
        <h2>What we collect</h2>
        <ul>
          <li>Business accounts: owner name, email, business name, category and an optional phone number.</li>
          <li>Orders: customer names and the contact details a business chooses to enter, items and amounts.</li>
          <li>Checkout: payment method choices and, for stablecoin payments, the buyer&apos;s email, which the payment provider requires.</li>
          <li>Security records: sign-in sessions, request identifiers and payment provider notifications.</li>
        </ul>
      </section>
      <section>
        <h2>How we use it</h2>
        <p>To run checkouts, confirm payments with the provider, show businesses their orders and settlements, prevent fraud, and send account and payment emails.</p>
      </section>
      <section>
        <h2>Sharing</h2>
        <p>Payment details are shared with Busha to process payments. We do not sell personal data.</p>
      </section>
      <section>
        <h2>Security</h2>
        <p>Passwords are hashed, sessions use secure cookies, and personal data and secrets are kept out of application logs.</p>
      </section>
      <section>
        <h2>Your choices</h2>
        <p>Businesses can edit customer contact details. A support contact for data requests will be published before launch.</p>
      </section>
    </LegalPage>
  );
}
