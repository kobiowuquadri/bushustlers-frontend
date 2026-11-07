"use client";

import Link from "next/link";
import { Suspense, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { formatDate, formatNaira } from "@/lib/format";
import { FULFILMENT_STATUS, orderPaymentMeta } from "@/lib/status";
import type { Customer, OrderSummary } from "@/lib/types";
import { Button, Card, CardHeader, ErrorState, Field, Input, Notice, PageHeader, PageSkeleton, StatusPill, useToast } from "@/components/ui";

function CustomerView() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const toast = useToast();
  const data = useQuery({ queryKey: ["customer", id], queryFn: () => api<{ customer: Customer; orders: OrderSummary[] }>(`/customers/${id}`) });
  const [form, setForm] = useState<{ name: string; phone: string; email: string; handle: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => api(`/customers/${id}`, { method: "PATCH", body: { name: form!.name.trim(), phone: form!.phone.trim() || null, email: form!.email.trim() || null, handle: form!.handle.trim() || null } }),
    onSuccess: () => {
      setForm(null);
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.show({ tone: "success", title: "Customer updated" });
    },
    onError: (err) => setError(err instanceof ApiError ? (err.fieldErrors[0]?.message ?? err.message) : "Couldn't save."),
  });

  if (data.isPending) return <PageSkeleton />;
  if (data.isError) return <ErrorState error={data.error} onRetry={() => data.refetch()} />;
  const { customer, orders } = data.data;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!form || form.name.trim().length < 2) return setError("Enter the customer's name.");
    save.mutate();
  };

  return (
    <>
      <PageHeader back={{ href: "/dashboard/customers", label: "Customers" }} title={customer.name} description={`${customer.orderCount ?? orders.length} orders · ${formatNaira(customer.totalPaidMinor ?? "0")} verified paid`} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
        <Card className="p-5 sm:p-6">
          <h2 className="text-base font-semibold">Contact</h2>
          {form ? (
            <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
              <Field label="Name" htmlFor="c-name"><Input id="c-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label="Phone or WhatsApp" htmlFor="c-phone" optional><Input id="c-phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
              <Field label="Email" htmlFor="c-email" optional><Input id="c-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
              <Field label="Handle" htmlFor="c-handle" optional><Input id="c-handle" value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} /></Field>
              {error ? <Notice tone="danger">{error}</Notice> : null}
              <div className="flex gap-2">
                <Button type="submit" loading={save.isPending}>Save</Button>
                <Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button>
              </div>
            </form>
          ) : (
            <>
              <dl className="mt-3 space-y-2 text-sm">
                <div><dt className="text-muted">Phone</dt><dd className="font-medium">{customer.phone ?? "—"}</dd></div>
                <div><dt className="text-muted">Email</dt><dd className="font-medium break-all">{customer.email ?? "—"}</dd></div>
                <div><dt className="text-muted">Handle</dt><dd className="font-medium">{customer.handle ?? "—"}</dd></div>
                <div><dt className="text-muted">Customer since</dt><dd className="font-medium">{formatDate(customer.createdAt)}</dd></div>
              </dl>
              <Button variant="secondary" size="sm" className="mt-4" onClick={() => setForm({ name: customer.name, phone: customer.phone ?? "", email: customer.email ?? "", handle: customer.handle ?? "" })}>
                Edit contact
              </Button>
            </>
          )}
        </Card>
        <Card>
          <CardHeader title="Orders" />
          {orders.length ? (
            <ul className="mt-2 divide-y divide-line">
              {orders.map((order) => (
                <li key={order.id}>
                  <Link href={`/dashboard/orders/${order.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 hover:bg-ivory/50 sm:px-6">
                    <div className="min-w-0">
                      <p className="font-semibold">{order.reference}</p>
                      <p className="truncate text-sm text-muted">{order.itemSummary} · {formatDate(order.createdAt)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="tabular font-semibold">{formatNaira(order.totalMinor)}</span>
                      <StatusPill meta={orderPaymentMeta(order.paymentStatus, order.status)} />
                      {order.paymentStatus === "paid" ? <StatusPill meta={FULFILMENT_STATUS[order.fulfilmentStatus]} /> : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-6 py-6 text-sm text-muted">No orders yet.</p>
          )}
        </Card>
      </div>
    </>
  );
}

export default function CustomerPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CustomerView />
    </Suspense>
  );
}
