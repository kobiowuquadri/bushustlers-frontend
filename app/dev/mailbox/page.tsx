"use client";

import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { LogoOnPanel } from "@/components/brand";
import { Card, ErrorState, Notice, Spinner } from "@/components/ui";

interface CapturedEmail {
  id: number;
  to: string;
  subject: string;
  template: string;
  html: string | null;
  createdAt: string;
}

// Development only: the backend registers /dev/mailbox only when no email provider is configured locally.
export default function DevMailboxPage() {
  const emails = useQuery({ queryKey: ["dev-mailbox"], queryFn: () => api<{ items: CapturedEmail[] }>("/dev/mailbox"), refetchInterval: 5000, retry: false });
  return (
    <div className="min-h-screen bg-ivory">
      <main className="mx-auto max-w-4xl px-4 py-8">
        <LogoOnPanel height={20} />
        <h1 className="mt-6 text-2xl font-bold">Development mailbox</h1>
        <Notice tone="warning" className="mt-3">
          Development only. Emails are captured here because no email provider is configured. This page doesn&apos;t exist in sandbox or production.
        </Notice>
        <div className="mt-6 space-y-4">
          {emails.isPending ? (
            <Spinner />
          ) : emails.isError ? (
            <Card><ErrorState error={emails.error instanceof ApiError && emails.error.status === 404 ? new ApiError(404, "The dev mailbox is disabled in this environment.") : emails.error} /></Card>
          ) : emails.data.items.length === 0 ? (
            <p className="text-muted">No emails yet. Sign up or request a password reset to see one here.</p>
          ) : (
            emails.data.items.map((email) => (
              <Card key={email.id} className="overflow-hidden">
                <div className="border-b border-line px-5 py-3 text-sm">
                  <p className="font-semibold">{email.subject}</p>
                  <p className="text-muted">To {email.to} · {formatDateTime(email.createdAt)}</p>
                </div>
                {email.html ? <iframe title={email.subject} srcDoc={email.html} sandbox="allow-popups allow-popups-to-escape-sandbox" className="h-[460px] w-full bg-ivory" /> : null}
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
