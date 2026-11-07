"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "./brand";
import { ButtonLink, cn } from "./ui";

const LINKS = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
];

export function MarketingHeader({ overlay = true }: { overlay?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <header className={cn("on-dark z-30 w-full", overlay ? "absolute inset-x-0 top-0" : "relative bg-forest")}>
      <div className="mx-auto flex h-18 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo height={26} priority />
        <nav aria-label="Main" className="hidden items-center gap-7 md:flex">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-medium text-on-dark hover:text-white">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <ButtonLink href="/sign-in" variant="mint-outline" size="sm">
            Sign in
          </ButtonLink>
          <ButtonLink href="/sign-up" size="sm">
            Get started
          </ButtonLink>
        </div>
        <button type="button" className="rounded-lg p-2 text-white md:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? <X className="size-6" aria-hidden /> : <Menu className="size-6" aria-hidden />}
        </button>
      </div>
      {open ? (
        <div className="border-t border-hair-dark bg-forest px-4 pb-5 pt-2 md:hidden">
          <nav aria-label="Mobile" className="flex flex-col">
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="py-3 text-base font-medium text-on-dark">
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ButtonLink href="/sign-in" variant="mint-outline">
              Sign in
            </ButtonLink>
            <ButtonLink href="/sign-up">Get started</ButtonLink>
          </div>
        </div>
      ) : null}
    </header>
  );
}

export function MarketingFooter({ supportEmail }: { supportEmail?: string | null }) {
  return (
    <footer className="on-dark bg-forest text-on-dark">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo height={26} />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-on-dark-muted">Payment links and payment confirmation for small businesses that sell on Instagram and WhatsApp in Nigeria.</p>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">Product</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/#how-it-works" className="hover:text-white">How it works</Link></li>
            <li><Link href="/#pricing" className="hover:text-white">Pricing</Link></li>
            <li><Link href="/sign-up" className="hover:text-white">Create an account</Link></li>
            <li><Link href="/sign-in" className="hover:text-white">Sign in</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">Company</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/legal/terms" className="hover:text-white">Terms of service (draft)</Link></li>
            <li><Link href="/legal/privacy" className="hover:text-white">Privacy notice (draft)</Link></li>
            <li>{supportEmail ? <a href={`mailto:${supportEmail}`} className="hover:text-white">{supportEmail}</a> : <span className="text-on-dark-muted">Support contact will be published before launch</span>}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-hair-dark">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-on-dark-muted sm:px-6">
          © 2026 Bushustlers. Payments are collected through Busha. Bushustlers is in a pilot and is not yet processing live payments.
        </p>
      </div>
    </footer>
  );
}
