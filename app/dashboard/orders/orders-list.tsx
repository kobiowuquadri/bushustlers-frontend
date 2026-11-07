"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Plus, Search, ShoppingBag } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate, formatNaira } from "@/lib/format";
import { FULFILMENT_STATUS, orderPaymentMeta } from "@/lib/status";
import type { OrderSummary, Paged } from "@/lib/types";
import { ButtonLink, Card, EmptyState, ErrorState, Input, PageHeader, Pagination, Pill, Skeleton, StatusPill, Tabs } from "@/components/ui";

const VIEWS = [
  { value: "all", label: "All" },
  { value: "awaiting_payment", label: "Awaiting payment" },
  { value: "to_fulfil", label: "Paid · to fulfil" },
  { value: "needs_review", label: "Needs review" },
  { value: "fulfilled", label: "Dispatched" },
  { value: "draft", label: "Drafts" },
  { value: "closed", label: "Expired & cancelled" },
] as const;
type View = (typeof VIEWS)[number]["value"];

export function OrdersList() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const view = (VIEWS.find((v) => v.value === params.get("view"))?.value ?? "all") as View;
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [search, setSearch] = useState(params.get("q") ?? "");
  const [debounced, setDebounced] = useState(search);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const setParams = (next: Record<string, string | null>) => {
    const query = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) query.set(key, value);
      else query.delete(key);
    }
    router.replace(`${pathname}${query.size ? `?${query}` : ""}`, { scroll: false });
  };

  useEffect(() => {
    if ((params.get("q") ?? "") !== debounced) setParams({ q: debounced || null, page: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const orders = useQuery({
    queryKey: ["orders", view, debounced, page],
    queryFn: () => api<Paged<OrderSummary>>(`/orders?view=${view}&page=${page}&limit=20${debounced ? `&search=${encodeURIComponent(debounced)}` : ""}`),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader
        title="Orders"
        description="Every order, its payment status and its fulfilment status, kept separate."
        actions={
          <ButtonLink href="/dashboard/orders/new" icon={<Plus className="size-4" aria-hidden />}>
            New order
          </ButtonLink>
        }
      />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs label="Filter orders" tabs={VIEWS.map((v) => ({ value: v.value, label: v.label }))} value={view} onChange={(value) => setParams({ view: value === "all" ? null : value, page: null })} />
        <div className="relative w-full lg:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input type="search" aria-label="Search orders" placeholder="Search reference or customer" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <Card className="overflow-hidden">
        {orders.isPending ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : orders.isError ? (
          <ErrorState error={orders.error} onRetry={() => orders.refetch()} />
        ) : orders.data.items.length === 0 ? (
          debounced || view !== "all" ? (
            <EmptyState icon={<Search className="size-6" aria-hidden />} title="No orders match" description="Try another filter or search term." />
          ) : (
            <EmptyState
              icon={<ShoppingBag className="size-6" aria-hidden />}
              title="No orders yet"
              description="Create an order, share its payment link in the chat, and we'll tell you when it's safe to ship."
              action={<ButtonLink href="/dashboard/orders/new">Create your first payment link</ButtonLink>}
            />
          )
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden w-full text-left text-sm md:table">
              <caption className="sr-only">Orders</caption>
              <thead className="border-b border-line bg-ivory/60 text-xs font-semibold uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col" className="px-5 py-3">Order</th>
                  <th scope="col" className="px-3 py-3">Customer</th>
                  <th scope="col" className="px-3 py-3 text-right">Total</th>
                  <th scope="col" className="px-3 py-3">Payment</th>
                  <th scope="col" className="px-3 py-3">Fulfilment</th>
                  <th scope="col" className="px-5 py-3 text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {orders.data.items.map((order) => (
                  <tr key={order.id} className="group cursor-pointer hover:bg-ivory/50" onClick={() => router.push(`/dashboard/orders/${order.id}`)}>
                    <td className="px-5 py-3.5">
                      <Link href={`/dashboard/orders/${order.id}`} className="font-semibold text-ink group-hover:underline" onClick={(e) => e.stopPropagation()}>
                        {order.reference}
                      </Link>
                      <p className="max-w-56 truncate text-muted">{order.itemSummary}</p>
                    </td>
                    <td className="px-3 py-3.5">{order.customer?.name ?? <span className="text-muted">—</span>}</td>
                    <td className="tabular px-3 py-3.5 text-right font-semibold">{formatNaira(order.totalMinor)}</td>
                    <td className="px-3 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        <StatusPill meta={orderPaymentMeta(order.paymentStatus, order.status)} />
                        {order.reviewRequired && order.paymentStatus === "paid" ? <Pill tone="danger">Review</Pill> : null}
                      </div>
                    </td>
                    <td className="px-3 py-3.5">{order.paymentStatus === "paid" ? <StatusPill meta={FULFILMENT_STATUS[order.fulfilmentStatus]} /> : <span className="text-muted">—</span>}</td>
                    <td className="px-5 py-3.5 text-right text-muted">{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Mobile list */}
            <ul className="divide-y divide-line md:hidden">
              {orders.data.items.map((order) => (
                <li key={order.id}>
                  <Link href={`/dashboard/orders/${order.id}`} className="block px-4 py-4 hover:bg-ivory/50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{order.reference}</p>
                        <p className="truncate text-sm text-muted">{order.customer?.name ?? "No customer"} · {order.itemSummary}</p>
                      </div>
                      <p className="tabular shrink-0 font-semibold">{formatNaira(order.totalMinor)}</p>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <StatusPill meta={orderPaymentMeta(order.paymentStatus, order.status)} />
                      {order.paymentStatus === "paid" ? <StatusPill meta={FULFILMENT_STATUS[order.fulfilmentStatus]} /> : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <Pagination pagination={orders.data.pagination} onPage={(next) => setParams({ page: next > 1 ? String(next) : null })} />
          </>
        )}
      </Card>
    </>
  );
}
