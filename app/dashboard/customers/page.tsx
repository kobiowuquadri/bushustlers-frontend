"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Search, Users } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate, formatNaira } from "@/lib/format";
import type { Customer, Paged } from "@/lib/types";
import { Card, EmptyState, ErrorState, Input, PageHeader, Pagination, Skeleton } from "@/components/ui";

export default function CustomersPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  const customers = useQuery({
    queryKey: ["customers", debounced, page],
    queryFn: () => api<Paged<Customer>>(`/customers?page=${page}${debounced ? `&search=${encodeURIComponent(debounced)}` : ""}`),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader title="Customers" description="Saved automatically from the orders you create." />
      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <Input type="search" aria-label="Search customers" placeholder="Name, phone, email or handle" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
      </div>
      <Card className="overflow-hidden">
        {customers.isPending ? (
          <div className="space-y-3 p-5">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : customers.isError ? (
          <ErrorState error={customers.error} onRetry={() => customers.refetch()} />
        ) : customers.data.items.length === 0 ? (
          <EmptyState icon={<Users className="size-6" aria-hidden />} title={debounced ? "No customers match" : "No customers yet"} description="Customers appear here when you add them to an order." />
        ) : (
          <>
            <ul className="divide-y divide-line md:hidden">
              {customers.data.items.map((c) => (
                <li key={c.id}>
                  <Link href={`/dashboard/customers/${c.id}`} className="block px-4 py-3.5 hover:bg-ivory/50">
                    <p className="font-semibold">{c.name}</p>
                    <p className="truncate text-sm text-muted">{[c.phone, c.email, c.handle].filter(Boolean).join(" · ") || "No contact details"}</p>
                    <p className="mt-1 text-sm">{c.orderCount} {c.orderCount === 1 ? "order" : "orders"} · {formatNaira(c.totalPaidMinor)} paid</p>
                  </Link>
                </li>
              ))}
            </ul>
            <table className="hidden w-full text-left text-sm md:table">
              <caption className="sr-only">Customers</caption>
              <thead className="border-b border-line bg-ivory/60 text-xs font-semibold uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col" className="px-5 py-3">Customer</th>
                  <th scope="col" className="px-3 py-3">Contact</th>
                  <th scope="col" className="px-3 py-3 text-right">Orders</th>
                  <th scope="col" className="px-3 py-3 text-right">Verified paid</th>
                  <th scope="col" className="px-5 py-3 text-right">Last order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {customers.data.items.map((c) => (
                  <tr key={c.id} className="cursor-pointer hover:bg-ivory/50" onClick={() => router.push(`/dashboard/customers/${c.id}`)}>
                    <td className="px-5 py-3.5">
                      <Link href={`/dashboard/customers/${c.id}`} className="font-semibold hover:underline" onClick={(e) => e.stopPropagation()}>{c.name}</Link>
                      {c.handle ? <p className="text-muted">{c.handle}</p> : null}
                    </td>
                    <td className="px-3 py-3.5 text-muted">{[c.phone, c.email].filter(Boolean).join(" · ") || "—"}</td>
                    <td className="tabular px-3 py-3.5 text-right">{c.orderCount}</td>
                    <td className="tabular px-3 py-3.5 text-right font-semibold">{formatNaira(c.totalPaidMinor)}</td>
                    <td className="px-5 py-3.5 text-right text-muted">{formatDate(c.lastOrderAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination pagination={customers.data.pagination} onPage={setPage} />
          </>
        )}
      </Card>
    </>
  );
}
