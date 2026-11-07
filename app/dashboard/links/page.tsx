"use client";

import Link from "next/link";
import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Link2, MessageCircle, Plus } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useBusiness } from "@/lib/hooks";
import { formatNaira, formatRelative } from "@/lib/format";
import { ATTEMPT_STATUS, LINK_STATUS } from "@/lib/status";
import type { LinkListItem, Paged } from "@/lib/types";
import { whatsappShareUrl } from "@/components/share-link";
import { Button, ButtonLink, buttonClass, Card, ConfirmDialog, CopyButton, EmptyState, ErrorState, PageHeader, Pagination, Skeleton, StatusPill, Tabs, useToast } from "@/components/ui";

const FILTERS = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Paid" },
  { value: "expired", label: "Expired" },
  { value: "disabled", label: "Disabled" },
];

export default function LinksPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [toDisable, setToDisable] = useState<LinkListItem | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();
  const business = useBusiness();
  const links = useQuery({
    queryKey: ["links", status, page],
    queryFn: () => api<Paged<LinkListItem>>(`/links?page=${page}${status ? `&status=${status}` : ""}`),
    placeholderData: keepPreviousData,
  });
  const disable = useMutation({
    mutationFn: (id: string) => api(`/links/${id}/disable`, { method: "POST" }),
    onSuccess: () => {
      setToDisable(null);
      queryClient.invalidateQueries({ queryKey: ["links"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.show({ tone: "success", title: "Link disabled" });
    },
    onError: (error) => toast.show({ tone: "danger", title: "Couldn't disable the link", description: error instanceof ApiError ? error.message : undefined }),
  });

  return (
    <>
      <PageHeader
        title="Payment links"
        description="One link per order. Disable a link any time before a payment starts."
        actions={
          <ButtonLink href="/dashboard/orders/new" icon={<Plus className="size-4" aria-hidden />}>
            Create payment link
          </ButtonLink>
        }
      />
      <div className="mb-4">
        <Tabs label="Filter links" tabs={FILTERS} value={status} onChange={(value) => { setStatus(value); setPage(1); }} />
      </div>
      <Card className="overflow-hidden">
        {links.isPending ? (
          <div className="space-y-3 p-5">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-20" />)}</div>
        ) : links.isError ? (
          <ErrorState error={links.error} onRetry={() => links.refetch()} />
        ) : links.data.items.length === 0 ? (
          <EmptyState icon={<Link2 className="size-6" aria-hidden />} title={status ? "No links here" : "No payment links yet"} description="Create an order to get a shareable payment link." action={<ButtonLink href="/dashboard/orders/new">Create payment link</ButtonLink>} />
        ) : (
          <>
            <ul className="divide-y divide-line">
              {links.data.items.map((link) => (
                <li key={link.id} className="flex flex-col gap-3 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {link.order ? (
                        <Link href={`/dashboard/orders/${link.order.id}`} className="font-semibold hover:underline">
                          {link.order.reference}
                        </Link>
                      ) : null}
                      <StatusPill meta={LINK_STATUS[link.status]} />
                      {link.latestPayment ? <StatusPill meta={ATTEMPT_STATUS[link.latestPayment.status]} /> : null}
                    </div>
                    <p className="mt-1 truncate text-sm text-muted">
                      {link.order?.customer?.name ?? "No customer"} · {link.order ? formatNaira(link.order.totalMinor) : ""} ·{" "}
                      {link.status === "active" ? `expires ${formatRelative(link.expiresAt)}` : `created ${formatRelative(link.createdAt)}`}
                      {link.paymentCount ? ` · ${link.paymentCount} payment ${link.paymentCount === 1 ? "attempt" : "attempts"}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <CopyButton value={link.url} label="Copy link" />
                    {link.status === "active" && link.order ? (
                      <>
                        <a href={whatsappShareUrl({ url: link.url, reference: link.order.reference, totalMinor: link.order.totalMinor, businessName: business.data?.business.name, customerName: link.order.customer?.name })} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "sm")}>
                          <MessageCircle className="size-4" aria-hidden />
                          WhatsApp
                        </a>
                        <a href={link.url} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "sm")} aria-label={`Preview checkout for ${link.order.reference}`}>
                          <ExternalLink className="size-4" aria-hidden />
                        </a>
                        {link.order.paymentStatus === "unpaid" ? (
                          <Button variant="danger" size="sm" onClick={() => setToDisable(link)}>
                            Disable
                          </Button>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
            <Pagination pagination={links.data.pagination} onPage={setPage} />
          </>
        )}
      </Card>
      <ConfirmDialog
        open={Boolean(toDisable)}
        onClose={() => setToDisable(null)}
        onConfirm={() => toDisable && disable.mutate(toDisable.id)}
        loading={disable.isPending}
        tone="danger"
        title={`Disable the link for ${toDisable?.order?.reference ?? "this order"}?`}
        description="Buyers can no longer start a payment with it. Late money sent to instructions already shown is flagged for review."
        confirmLabel="Disable link"
      />
    </>
  );
}
