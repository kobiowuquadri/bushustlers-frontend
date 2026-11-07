"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { useMe } from "@/lib/hooks";
import { LogoOnPanel } from "@/components/brand";
import { Button, Card, Field, Input, Notice, Select, Spinner } from "@/components/ui";

const CATEGORIES: Record<string, string> = {
  fashion: "Fashion and clothing",
  beauty: "Beauty and personal care",
  food: "Food and drinks",
  home: "Home and living",
  electronics: "Phones and electronics",
  crafts: "Art and crafts",
  services: "Services",
  other: "Other",
};

// Mirrors the backend's suggestion so the merchant sees the reference format before saving
const suggestPrefix = (name: string) => {
  const words = name.toUpperCase().replace(/[^A-Z ]/g, " ").split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  const [first, ...rest] = words;
  let prefix = first[0];
  for (const char of first.slice(1)) {
    if (prefix.length === 3) break;
    if (!"AEIOU".includes(char)) prefix += char;
  }
  for (const word of rest) {
    if (prefix.length === 3) break;
    prefix += word[0];
  }
  return prefix.padEnd(3, "X").slice(0, 3);
};

export default function OnboardingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const me = useMe();
  const [form, setForm] = useState({ ownerName: "", businessName: "", category: "fashion", phone: "", orderPrefix: "" });
  const [prefixTouched, setPrefixTouched] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (me.data?.onboardingComplete) router.replace("/dashboard");
    if (me.data && !form.ownerName && me.data.user.fullName) setForm((f) => ({ ...f, ownerName: me.data!.user.fullName || "" }));
  }, [me.data, router, form.ownerName]);

  const prefix = prefixTouched ? form.orderPrefix : suggestPrefix(form.businessName);

  const create = useMutation({
    mutationFn: () =>
      api("/business", {
        method: "POST",
        body: { ownerName: form.ownerName.trim(), businessName: form.businessName.trim(), category: form.category, phone: form.phone.trim() || null, orderPrefix: prefix || undefined, settlementPreference: "naira" },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      router.replace("/dashboard/orders/new");
    },
    onError: (err) => {
      const mapped: Record<string, string> = {};
      if (err instanceof ApiError) for (const e of err.fieldErrors) mapped[e.field] = e.message;
      setErrors(mapped);
      setError(err instanceof ApiError ? err.message : "Couldn't save. Try again.");
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const next: Record<string, string> = {};
    if (form.ownerName.trim().length < 2) next.ownerName = "Enter your full name";
    if (form.businessName.trim().length < 2) next.businessName = "Enter your business name";
    if (prefix && !/^[A-Z]{2,5}$/.test(prefix)) next.orderPrefix = "Use 2-5 letters";
    setErrors(next);
    if (!Object.keys(next).length) create.mutate();
  };

  if (me.isPending) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory">
      <header className="mx-auto max-w-xl px-4 pt-6">
        <LogoOnPanel height={20} />
      </header>
      <main className="mx-auto max-w-xl px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Set up your business</h1>
        <p className="mt-1.5 text-muted">This is what buyers see on your checkout. It takes a minute.</p>
        <Card className="mt-6 p-5 sm:p-6">
          <form onSubmit={submit} noValidate className="space-y-5">
            <Field label="Your full name" htmlFor="ownerName" error={errors.ownerName}>
              <Input id="ownerName" autoComplete="name" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
            </Field>
            <Field label="Business name" htmlFor="businessName" error={errors.businessName} hint="Shown to buyers at checkout, e.g. Amaka Clothing">
              <Input id="businessName" autoComplete="organization" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
            </Field>
            <Field label="Category" htmlFor="category">
              <Select id="category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {Object.entries(CATEGORIES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Business phone" htmlFor="phone" optional error={errors.phone} hint="WhatsApp or call number">
              <Input id="phone" type="tel" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0803 123 4567" />
            </Field>
            <Field label="Order reference prefix" htmlFor="orderPrefix" error={errors.orderPrefix} hint={prefix ? `Your orders will look like ${prefix}-101` : "2-5 letters"}>
              <Input
                id="orderPrefix"
                value={prefix}
                maxLength={5}
                onChange={(e) => {
                  setPrefixTouched(true);
                  setForm({ ...form, orderPrefix: e.target.value.toUpperCase().replace(/[^A-Z]/g, "") });
                }}
              />
            </Field>
            <fieldset>
              <legend className="text-sm font-semibold">Settlement preference</legend>
              <div className="mt-2 space-y-2">
                <label className="flex items-start gap-3 rounded-xl border border-forest bg-paper p-3.5 text-sm ring-1 ring-forest">
                  <input type="radio" name="settlement" checked readOnly className="mt-0.5 size-4 accent-[#08281F]" />
                  <span>
                    <span className="font-semibold">Naira to a Nigerian bank account</span>
                    <span className="block text-muted">Stablecoin payments are converted to naira by the provider.</span>
                  </span>
                </label>
                <label className="flex items-start gap-3 rounded-xl border border-line bg-bubble/60 p-3.5 text-sm text-muted">
                  <input type="radio" name="settlement" disabled className="mt-0.5 size-4" />
                  <span>
                    <span className="font-semibold">Keep a stablecoin balance</span>
                    <span className="block">Not available yet.</span>
                  </span>
                </label>
              </div>
            </fieldset>
            <Notice tone="info">
              Basic account setup doesn&apos;t verify your business with any payment provider. Any provider verification will be shown in Settings only once it&apos;s confirmed.
            </Notice>
            {error ? <Notice tone="danger">{error}</Notice> : null}
            <Button type="submit" size="lg" className="w-full" loading={create.isPending}>
              Continue
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
