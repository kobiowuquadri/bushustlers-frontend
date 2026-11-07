"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { formatNaira, minorToInput, parseNairaToMinor } from "@/lib/format";
import type { OrderDetail, PaymentLink } from "@/lib/types";
import { Button, Card, CardHeader, Field, Input, Notice, Select, Textarea, useToast } from "./ui";

interface ItemRow {
  key: number;
  name: string;
  quantity: string;
  price: string;
}

let rowKey = 0;
const emptyRow = (): ItemRow => ({ key: ++rowKey, name: "", quantity: "1", price: "" });

export function OrderForm({ order }: { order?: OrderDetail }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const editing = Boolean(order);

  const [customer, setCustomer] = useState({
    name: order?.customer?.name ?? "",
    phone: order?.customer?.phone ?? "",
    email: order?.customer?.email ?? "",
    handle: order?.customer?.handle ?? "",
  });
  const [items, setItems] = useState<ItemRow[]>(
    order?.items.length ? order.items.map((item) => ({ key: ++rowKey, name: item.name, quantity: String(item.quantity), price: minorToInput(item.unitPriceMinor) })) : [emptyRow()],
  );
  const [delivery, setDelivery] = useState(order ? minorToInput(order.deliveryFeeMinor === "0" ? "" : order.deliveryFeeMinor) : "");
  const [note, setNote] = useState(order?.note ?? "");
  const [expiresInHours, setExpiresInHours] = useState("72");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Preview only: the server recalculates every total from the line items
  const lineMinor = (row: ItemRow) => {
    const unit = parseNairaToMinor(row.price);
    const qty = /^\d+$/.test(row.quantity) ? BigInt(row.quantity) : 0n;
    return unit ? BigInt(unit) * qty : 0n;
  };
  const subtotal = items.reduce((sum, row) => sum + lineMinor(row), 0n);
  const deliveryMinor = delivery.trim() ? parseNairaToMinor(delivery) : "0";
  const total = subtotal + BigInt(deliveryMinor ?? "0");

  const validate = () => {
    const next: Record<string, string> = {};
    if (customer.name.trim().length < 2) next.customerName = "Enter the customer's name";
    items.forEach((row, index) => {
      if (!row.name.trim()) next[`items.${index}.name`] = "Enter an item name";
      if (!/^\d+$/.test(row.quantity) || Number(row.quantity) < 1) next[`items.${index}.quantity`] = "At least 1";
      const unit = parseNairaToMinor(row.price);
      if (!unit || unit === "0") next[`items.${index}.price`] = "Enter a price, e.g. 45000";
    });
    if (delivery.trim() && !deliveryMinor) next.delivery = "Enter a valid amount, e.g. 2500";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = useMutation({
    mutationFn: async (createLink: boolean) => {
      const body = {
        customer: {
          name: customer.name.trim(),
          phone: customer.phone.trim() || null,
          email: customer.email.trim() || null,
          handle: customer.handle.trim() || null,
        },
        items: items.map((row) => ({ name: row.name.trim(), quantity: Number(row.quantity), unitPriceMinor: parseNairaToMinor(row.price) })),
        deliveryFeeMinor: deliveryMinor ?? "0",
        note: note.trim() || null,
      };
      const saved = order
        ? await api<{ order: OrderDetail }>(`/orders/${order.id}`, { method: "PUT", body })
        : await api<{ order: OrderDetail }>("/orders", { method: "POST", body });
      if (createLink) {
        await api<{ link: PaymentLink }>(`/orders/${saved.order.id}/links`, { method: "POST", body: { expiresInHours: Number(expiresInHours) } });
      }
      return saved.order;
    },
    onSuccess: (saved, createLink) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order", saved.id] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      toast.show({ tone: "success", title: createLink ? `Payment link ready for ${saved.reference}` : editing ? "Order updated" : `Draft ${saved.reference} saved` });
      router.push(`/dashboard/orders/${saved.id}${createLink ? "?share=1" : ""}`);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.fieldErrors.length) {
        const mapped: Record<string, string> = {};
        for (const e of error.fieldErrors) {
          const match = e.field.match(/^items\[(\d+)\]\.(\w+)$/);
          if (match) mapped[`items.${match[1]}.${match[2] === "unitPriceMinor" ? "price" : match[2]}`] = e.message;
          else if (e.field.startsWith("customer.")) mapped[e.field === "customer.name" ? "customerName" : e.field.replace("customer.", "customer_")] = e.message;
          else mapped[e.field] = e.message;
        }
        setErrors(mapped);
      }
      setFormError(error instanceof ApiError ? error.message : "Couldn't save the order. Try again.");
    },
  });

  const submit = (createLink: boolean) => (event?: FormEvent) => {
    event?.preventDefault();
    setFormError(null);
    if (validate()) save.mutate(createLink);
  };

  const updateRow = (key: number, patch: Partial<ItemRow>) => setItems((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  const describedBy = (id: string) => (errors[id] ? `${id}-error` : undefined);

  return (
    <form onSubmit={submit(true)} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div className="space-y-6">
        <Card>
          <CardHeader title="Customer" description="Who is this order for? We'll save them to your customers." />
          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
            <Field label="Customer name" htmlFor="customerName" error={errors.customerName} className="sm:col-span-2">
              <Input id="customerName" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} autoComplete="off" aria-invalid={Boolean(errors.customerName)} aria-describedby={describedBy("customerName")} placeholder="e.g. Tolu Adeyemi" />
            </Field>
            <Field label="Phone or WhatsApp" htmlFor="customer_phone" optional error={errors.customer_phone} hint="Nigerian or international with country code">
              <Input id="customer_phone" type="tel" inputMode="tel" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder="0803 123 4567" aria-invalid={Boolean(errors.customer_phone)} />
            </Field>
            <Field label="Email" htmlFor="customer_email" optional error={errors.customer_email} hint="Used for stablecoin checkouts and receipts">
              <Input id="customer_email" type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} placeholder="tolu@example.com" aria-invalid={Boolean(errors.customer_email)} />
            </Field>
            <Field label="Instagram or WhatsApp handle" htmlFor="customer_handle" optional className="sm:col-span-2">
              <Input id="customer_handle" value={customer.handle} onChange={(e) => setCustomer({ ...customer, handle: e.target.value })} placeholder="@tolu.wears" />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Items" description="Add each item the customer is paying for." />
          <div className="space-y-4 p-5 sm:p-6">
            {items.map((row, index) => (
              <div key={row.key} className="grid grid-cols-[1fr_auto] gap-3 rounded-2xl border border-line p-4 sm:grid-cols-[minmax(0,1fr)_88px_150px_auto] sm:items-start sm:border-0 sm:p-0">
                <Field label={<span className={index ? "sm:sr-only" : ""}>Item</span>} htmlFor={`item-name-${row.key}`} error={errors[`items.${index}.name`]} className="col-span-2 sm:col-span-1">
                  <Input id={`item-name-${row.key}`} value={row.name} onChange={(e) => updateRow(row.key, { name: e.target.value })} placeholder="Linen two-piece set" aria-invalid={Boolean(errors[`items.${index}.name`])} />
                </Field>
                <Field label={<span className={index ? "sm:sr-only" : ""}>Qty</span>} htmlFor={`item-qty-${row.key}`} error={errors[`items.${index}.quantity`]}>
                  <Input id={`item-qty-${row.key}`} inputMode="numeric" value={row.quantity} onChange={(e) => updateRow(row.key, { quantity: e.target.value.replace(/[^\d]/g, "") })} aria-invalid={Boolean(errors[`items.${index}.quantity`])} />
                </Field>
                <Field label={<span className={index ? "sm:sr-only" : ""}>Unit price (₦)</span>} htmlFor={`item-price-${row.key}`} error={errors[`items.${index}.price`]}>
                  <Input id={`item-price-${row.key}`} inputMode="decimal" value={row.price} onChange={(e) => updateRow(row.key, { price: e.target.value })} placeholder="45,000" aria-invalid={Boolean(errors[`items.${index}.price`])} className="tabular" />
                </Field>
                <div className={index ? "col-span-2 flex justify-end sm:col-span-1 sm:pt-0" : "col-span-2 flex justify-end sm:col-span-1 sm:pt-7"}>
                  <Button variant="ghost" size="sm" disabled={items.length === 1} onClick={() => setItems((rows) => rows.filter((r) => r.key !== row.key))} aria-label={`Remove ${row.name || "item"}`} icon={<Trash2 className="size-4" aria-hidden />}>
                    <span className="sm:hidden">Remove</span>
                  </Button>
                </div>
              </div>
            ))}
            <Button variant="secondary" size="sm" onClick={() => setItems((rows) => [...rows, emptyRow()])} disabled={items.length >= 50} icon={<Plus className="size-4" aria-hidden />}>
              Add item
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader title="Delivery and notes" />
          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
            <Field label="Delivery charge (₦)" htmlFor="delivery" optional error={errors.delivery} hint="Added to the order total">
              <Input id="delivery" inputMode="decimal" value={delivery} onChange={(e) => setDelivery(e.target.value)} placeholder="0" className="tabular" aria-invalid={Boolean(errors.delivery)} />
            </Field>
            <Field label="Note for your records" htmlFor="note" optional className="sm:col-span-2" hint="Only you can see this.">
              <Textarea id="note" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Size M, pick-up from Bodija" />
            </Field>
          </div>
        </Card>
      </div>

      <div className="space-y-4 lg:sticky lg:top-24">
        <Card className="p-5 sm:p-6">
          <h2 className="text-base font-semibold">Summary</h2>
          <dl className="mt-3 divide-y divide-line text-sm">
            <div className="flex justify-between py-2.5">
              <dt className="text-muted">Items</dt>
              <dd className="tabular font-medium">{formatNaira(subtotal.toString())}</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-muted">Delivery</dt>
              <dd className="tabular font-medium">{formatNaira(deliveryMinor ?? "0")}</dd>
            </div>
            <div className="flex justify-between py-3 text-base">
              <dt className="font-semibold">Total to collect</dt>
              <dd className="tabular font-bold">{formatNaira(total.toString())}</dd>
            </div>
          </dl>
          <p className="text-xs text-muted">Your buyer pays this total. Bushustlers fees are deducted from your settlement, never added to the buyer&apos;s total.</p>

          <Field label="Link expires after" htmlFor="expiry" className="mt-5">
            <Select id="expiry" value={expiresInHours} onChange={(e) => setExpiresInHours(e.target.value)}>
              <option value="24">24 hours</option>
              <option value="72">3 days</option>
              <option value="168">7 days</option>
            </Select>
          </Field>

          {formError ? <Notice tone="danger" className="mt-4">{formError}</Notice> : null}

          <div className="mt-5 flex flex-col gap-2">
            <Button type="submit" size="lg" loading={save.isPending && save.variables === true}>
              {editing ? "Save and create payment link" : "Create payment link"}
            </Button>
            <Button variant="secondary" onClick={() => submit(false)()} loading={save.isPending && save.variables === false}>
              {editing ? "Save changes" : "Save as draft"}
            </Button>
          </div>
        </Card>
      </div>
    </form>
  );
}
