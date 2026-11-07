"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { useBusiness, useMe } from "@/lib/hooks";
import { MODE_LABEL } from "@/lib/status";
import type { BusinessResponse, Me } from "@/lib/types";
import { Button, Card, CardHeader, ErrorState, Field, Input, Notice, PageHeader, PageSkeleton, Pill, Row, Select, Toggle, useToast } from "@/components/ui";

const PASSWORD_RULE = "8+ characters with an uppercase letter, a lowercase letter, a number and a symbol.";

export default function SettingsPage() {
  const me = useMe();
  const business = useBusiness();
  if (business.isPending || me.isPending || !me.data) return <PageSkeleton />;
  if (business.isError) return <ErrorState error={business.error} onRetry={() => business.refetch()} />;
  return <SettingsView me={me.data} data={business.data} />;
}

// Rendered once the data is loaded, so form state starts from the saved values
function SettingsView({ me, data }: { me: Me; data: BusinessResponse }) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [profile, setProfile] = useState({ businessName: data.business.name, category: data.business.category, phone: data.business.phone ?? "", orderPrefix: data.business.orderPrefix });
  const [ownerName, setOwnerName] = useState(me.user.fullName ?? "");
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const saveBusiness = useMutation({
    mutationFn: (body: Record<string, unknown>) => api("/business", { method: "PATCH", body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.show({ tone: "success", title: "Settings saved" });
    },
    onError: (err) => setProfileError(err instanceof ApiError ? (err.fieldErrors[0]?.message ?? err.message) : "Couldn't save."),
  });
  const saveName = useMutation({
    mutationFn: () => api("/auth/me", { method: "PATCH", body: { fullName: ownerName.trim() } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.show({ tone: "success", title: "Name updated" });
    },
    onError: (err) => toast.show({ tone: "danger", title: "Couldn't update your name", description: err instanceof ApiError ? err.message : undefined }),
  });
  const changePassword = useMutation({
    mutationFn: () => api("/auth/change-password", { method: "POST", body: passwords }),
    onSuccess: () => {
      setPasswords({ currentPassword: "", newPassword: "" });
      toast.show({ tone: "success", title: "Password changed", description: "Other devices have been signed out." });
    },
    onError: (err) => setPasswordError(err instanceof ApiError ? (err.fieldErrors[0]?.message ?? err.message) : "Couldn't change the password."),
  });
  const signOutOthers = useMutation({
    mutationFn: () => api<{ revoked: number }>("/auth/logout-others", { method: "POST" }),
    onSuccess: () => toast.show({ tone: "success", title: "Other devices signed out" }),
  });

  const { business: b, environment: env, categories } = data;

  const submitProfile = (event: FormEvent) => {
    event.preventDefault();
    setProfileError(null);
    if (profile.businessName.trim().length < 2) return setProfileError("Enter your business name.");
    if (!/^[A-Z]{2,5}$/.test(profile.orderPrefix)) return setProfileError("Order prefix must be 2-5 letters.");
    saveBusiness.mutate({ businessName: profile.businessName.trim(), category: profile.category, phone: profile.phone.trim() || null, orderPrefix: profile.orderPrefix });
  };
  const submitPassword = (event: FormEvent) => {
    event.preventDefault();
    setPasswordError(null);
    if (!passwords.currentPassword) return setPasswordError("Enter your current password.");
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,72}$/.test(passwords.newPassword)) return setPasswordError(`New password: ${PASSWORD_RULE}`);
    changePassword.mutate();
  };

  const verification = { not_started: "Not started", pending: "Pending", verified: "Verified", rejected: "Rejected" }[b.providerVerification.status];

  return (
    <>
      <PageHeader title="Settings" description="Your business profile, account, security and payment environment." />
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Card>
          <CardHeader title="Business profile" description="Shown to buyers on checkout and receipts." />
          <form onSubmit={submitProfile} className="space-y-4 p-5 sm:p-6" noValidate>
            <Field label="Business name" htmlFor="s-name"><Input id="s-name" value={profile.businessName} onChange={(e) => setProfile({ ...profile, businessName: e.target.value })} /></Field>
            <Field label="Category" htmlFor="s-category">
              <Select id="s-category" value={profile.category} onChange={(e) => setProfile({ ...profile, category: e.target.value })}>
                {Object.entries(categories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
            </Field>
            <Field label="Business phone" htmlFor="s-phone" optional><Input id="s-phone" type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></Field>
            <Field label="Order reference prefix" htmlFor="s-prefix" hint={`Next order: ${profile.orderPrefix || b.orderPrefix}-${b.nextOrderReference.split("-").pop()}. Changing it only affects new orders.`}>
              <Input id="s-prefix" value={profile.orderPrefix} maxLength={5} onChange={(e) => setProfile({ ...profile, orderPrefix: e.target.value.toUpperCase().replace(/[^A-Z]/g, "") })} />
            </Field>
            {profileError ? <Notice tone="danger">{profileError}</Notice> : null}
            <Button type="submit" loading={saveBusiness.isPending && !saveBusiness.variables?.notifyPaymentEmails && saveBusiness.variables?.notifyReviewEmails === undefined}>Save profile</Button>
          </form>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Account" />
            <div className="space-y-4 p-5 sm:p-6">
              <Field label="Your name" htmlFor="s-owner">
                <div className="flex gap-2">
                  <Input id="s-owner" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
                  <Button variant="secondary" onClick={() => ownerName.trim().length >= 2 && saveName.mutate()} loading={saveName.isPending}>Save</Button>
                </div>
              </Field>
              <dl className="divide-y divide-line">
                <Row label="Email">{me.user.email}</Row>
                <Row label="Email status">{me.user.emailVerified ? <Pill tone="success">Confirmed</Pill> : <Pill tone="warning">Not confirmed</Pill>}</Row>
              </dl>
            </div>
          </Card>

          <Card>
            <CardHeader title="Notifications" description="Email alerts to the account owner." />
            <div className="space-y-5 p-5 sm:p-6">
              <Toggle id="n-pay" label="Payment confirmed" description="When an order is verified as paid." checked={b.notifications.paymentEmails} onChange={(value) => saveBusiness.mutate({ notifyPaymentEmails: value })} disabled={saveBusiness.isPending} />
              <Toggle id="n-review" label="Payment needs review" description="Short, extra, late or second payments." checked={b.notifications.reviewEmails} onChange={(value) => saveBusiness.mutate({ notifyReviewEmails: value })} disabled={saveBusiness.isPending} />
              {env.email.delivery === "dev_mailbox" ? <p className="text-xs text-muted">Development: emails are captured in the <a href="/dev/mailbox" className="underline">dev mailbox</a> instead of being sent.</p> : null}
              {env.email.delivery === "disabled" ? <Notice tone="warning">Email delivery isn&apos;t configured, so alerts can&apos;t be sent yet.</Notice> : null}
            </div>
          </Card>
        </div>

        <Card>
          <CardHeader title="Security" />
          <form onSubmit={submitPassword} className="space-y-4 p-5 sm:p-6" noValidate>
            <Field label="Current password" htmlFor="p-current"><Input id="p-current" type="password" autoComplete="current-password" value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} /></Field>
            <Field label="New password" htmlFor="p-new" hint={PASSWORD_RULE}><Input id="p-new" type="password" autoComplete="new-password" value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} /></Field>
            {passwordError ? <Notice tone="danger">{passwordError}</Notice> : null}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="dark" loading={changePassword.isPending}>Change password</Button>
              <Button variant="secondary" onClick={() => signOutOthers.mutate()} loading={signOutOthers.isPending}>Sign out other devices</Button>
            </div>
          </form>
        </Card>

        <Card>
          <CardHeader title="Payments and settlement" />
          <dl className="divide-y divide-line px-5 pb-5 sm:px-6 sm:pb-6">
            <Row label="Payments mode"><Pill tone={env.payments.mode === "production" ? "success" : "warning"}>{MODE_LABEL[env.payments.mode]}</Pill></Row>
            <Row label="Bank transfer (NGN)">{env.payments.bankTransfer ? "Available" : "Unavailable"}</Row>
            <Row label="Stablecoins">{env.payments.stablecoin ? env.payments.stablecoinOptions.map((o) => `${o.asset} (${o.network})`).join(", ") : "Unavailable"}</Row>
            <Row label="Settlement preference">Naira to a Nigerian bank account</Row>
            <Row label="Stablecoin balance settlement">Not available yet</Row>
            <Row label="Automatic payouts">Not available in this release</Row>
            <Row label="Provider verification">
              <Pill tone={b.providerVerification.status === "verified" ? "success" : b.providerVerification.status === "rejected" ? "danger" : "neutral"}>{verification}</Pill>
            </Row>
          </dl>
          <p className="px-5 pb-5 text-xs text-muted sm:px-6 sm:pb-6">
            Provider verification is shown only once the payment provider confirms it. Fees: {env.fees.ngnBps / 100}% per verified naira payment (capped), {env.fees.stablecoinBps / 100}% per stablecoin checkout. Proposed pricing.
          </p>
        </Card>
      </div>
    </>
  );
}
