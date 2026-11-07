"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, Landmark, LayoutGrid, Link2, LogOut, Menu, Plus, Settings, ShoppingBag, Users, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useBusiness, useMe } from "@/lib/hooks";
import { initials } from "@/lib/format";
import { Logo } from "./brand";
import { Button, ButtonLink, cn, Spinner, useToast } from "./ui";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutGrid },
  { href: "/dashboard/orders", label: "Orders", icon: ShoppingBag },
  { href: "/dashboard/links", label: "Payment links", icon: Link2 },
  { href: "/dashboard/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/dashboard/customers", label: "Customers", icon: Users },
  { href: "/dashboard/settlements", label: "Settlements", icon: Landmark },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors",
              active ? "bg-forest-2 text-white" : "text-on-dark-muted hover:bg-forest-2/60 hover:text-white",
            )}
          >
            <Icon className={cn("size-[18px]", active ? "text-mint" : "")} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function ModeBanner({ mode }: { mode?: string }) {
  if (mode === "demo") {
    return (
      <div className="bg-amber-tint px-4 py-2 text-center text-sm font-medium text-amber-ink">
        Demo mode: payment instructions and confirmations are simulated. No real money moves.
      </div>
    );
  }
  if (mode === "sandbox") {
    return <div className="bg-sky-tint px-4 py-2 text-center text-sm font-medium text-sky-ink">Busha sandbox: test payments only. No real money moves.</div>;
  }
  return null;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const me = useMe();
  const ready = Boolean(me.data?.onboardingComplete);
  const business = useBusiness(ready);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (me.error instanceof ApiError && me.error.status === 401) {
      router.replace(`/sign-in?next=${encodeURIComponent(pathname)}${me.error.code === "session_ended" ? "&expired=1" : ""}`);
    } else if (me.data && !me.data.onboardingComplete) {
      router.replace("/onboarding");
    }
  }, [me.error, me.data, pathname, router]);

  useEffect(() => setMenuOpen(false), [pathname]);

  const signOut = useMutation({
    mutationFn: () => api("/auth/logout", { method: "POST" }),
    onSettled: () => {
      queryClient.clear();
      router.replace("/sign-in");
    },
  });

  const resend = useMutation({
    mutationFn: () => api("/auth/resend-verification", { method: "POST" }),
    onSuccess: () => toast.show({ tone: "success", title: "Confirmation link sent", description: `Check ${me.data?.user.email}.` }),
    onError: (error) => toast.show({ tone: "danger", title: "Couldn't send the link", description: error instanceof ApiError ? error.message : undefined }),
  });

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-ivory">
        {me.error && !(me.error instanceof ApiError && me.error.status === 401) ? (
          <div className="text-center">
            <p className="text-sm text-muted">{me.error instanceof ApiError ? me.error.message : "We couldn't load your account."}</p>
            <Button variant="secondary" className="mt-4" onClick={() => me.refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <Spinner label="Loading your workspace" />
        )}
      </div>
    );
  }

  const user = me.data!.user;
  const businessName = business.data?.business.name ?? me.data!.business?.name ?? "";
  const mode = business.data?.environment.payments.mode;

  const sidebarFooter = (
    <div className="mt-auto border-t border-hair-dark pt-4">
      <div className="flex items-center gap-3 px-1">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-forest-3 text-sm font-semibold text-mint">{initials(user.fullName || user.email)}</span>
        <div className="min-w-0 text-sm">
          <p className="truncate font-semibold text-white">{businessName}</p>
          <p className="truncate text-on-dark-muted">{user.fullName || user.email}</p>
        </div>
      </div>
      <Button variant="mint-outline" size="sm" className="mt-4 w-full" onClick={() => signOut.mutate()} loading={signOut.isPending} icon={<LogOut className="size-4" aria-hidden />}>
        Sign out
      </Button>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1">
        {/* Desktop sidebar: full viewport height, scrolls on its own if the window is short */}
        <aside className="on-dark sticky top-0 hidden h-dvh w-64 shrink-0 flex-col overflow-y-auto bg-forest px-4 py-6 lg:flex">
          <Logo height={26} href="/dashboard" className="mb-8 px-2" />
          <NavLinks pathname={pathname} />
          {sidebarFooter}
        </aside>

        {/* Mobile drawer */}
        {menuOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
            <button type="button" className="absolute inset-0 bg-forest/60" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
            <div className="on-dark absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-forest px-4 py-5">
              <div className="mb-6 flex items-center justify-between px-2">
                <Logo height={24} href="/dashboard" />
                <button type="button" onClick={() => setMenuOpen(false)} className="rounded-lg p-1.5 text-on-dark hover:bg-forest-2" aria-label="Close menu">
                  <X className="size-5" aria-hidden />
                </button>
              </div>
              <NavLinks pathname={pathname} onNavigate={() => setMenuOpen(false)} />
              {sidebarFooter}
            </div>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <ModeBanner mode={mode} />
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line/80 bg-ivory/90 px-4 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 lg:hidden">
              <button type="button" onClick={() => setMenuOpen(true)} className="rounded-lg p-2 text-ink hover:bg-paper" aria-label="Open menu" aria-expanded={menuOpen}>
                <Menu className="size-5" aria-hidden />
              </button>
              <span className="truncate text-sm font-semibold text-ink">{businessName}</span>
            </div>
            <p className="hidden truncate text-sm text-muted lg:block">{businessName}</p>
            <ButtonLink href="/dashboard/orders/new" size="sm" icon={<Plus className="size-4" aria-hidden />}>
              <span className="hidden sm:inline">Create payment link</span>
              <span className="sm:hidden">New link</span>
            </ButtonLink>
          </header>

          {!user.emailVerified ? (
            <div className="border-b border-line/80 bg-paper px-4 py-2.5 text-sm text-muted sm:px-6 lg:px-8">
              Confirm your email address ({user.email}) to keep your account secure.{" "}
              <button type="button" className="font-semibold text-ink underline underline-offset-2" onClick={() => resend.mutate()} disabled={resend.isPending}>
                {resend.isPending ? "Sending…" : "Resend link"}
              </button>
            </div>
          ) : null}

          <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
