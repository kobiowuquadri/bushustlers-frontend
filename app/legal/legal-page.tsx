import { MarketingFooter, MarketingHeader } from "@/components/marketing";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <>
      <MarketingHeader overlay={false} />
      <main className="bg-ivory">
        <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <p className="rounded-2xl bg-amber-tint px-4 py-3 text-sm font-medium text-amber-ink">
            Draft for the pilot. This text has not been reviewed or approved by a lawyer and is not yet a binding policy.
          </p>
          <h1 className="mt-8 text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted">Draft last updated {updated}</p>
          <div className="mt-8 space-y-6 leading-relaxed text-ink [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:text-muted [&_li]:text-muted">{children}</div>
        </article>
      </main>
      <MarketingFooter />
    </>
  );
}
