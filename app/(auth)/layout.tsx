import Image from "next/image";
import { Logo, LogoOnPanel } from "@/components/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <aside className="on-dark relative hidden overflow-hidden bg-forest lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Logo height={30} />
        <div className="relative z-10 max-w-md">
          <p className="text-3xl font-bold leading-tight tracking-tight text-white">Send a link. Confirm the payment. Fulfil the order.</p>
          <p className="mt-4 text-on-dark">One payment link per order, and one status you can trust before you ship.</p>
        </div>
        <div className="relative z-10 overflow-hidden rounded-card">
          <Image src="/brand/support.webp" alt="Seller and supplier reviewing packaged fabric orders" width={1200} height={800} className="h-56 w-full object-cover" priority />
        </div>
      </aside>
      <main className="flex flex-col bg-ivory">
        <div className="px-6 pt-6 lg:hidden">
          <LogoOnPanel height={20} />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </main>
    </div>
  );
}
