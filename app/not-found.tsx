import Link from "next/link";
import { LogoOnPanel } from "@/components/brand";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-ivory px-4 text-center">
      <div>
        <LogoOnPanel height={20} className="mx-auto" />
        <h1 className="mt-8 text-3xl font-bold">Page not found</h1>
        <p className="mt-2 text-muted">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
        <Link href="/" className="mt-6 inline-flex h-11 items-center rounded-control bg-mint px-5 font-semibold text-forest">Go to the homepage</Link>
      </div>
    </main>
  );
}
