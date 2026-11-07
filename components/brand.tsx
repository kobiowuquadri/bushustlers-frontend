import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";

// The supplied wordmark is white-on-transparent artwork for dark surfaces (aspect 480:94).
// On light surfaces it sits on its own forest panel, as the brand kit asks, instead of being recoloured.
export function Logo({ className, height = 28, href = "/", priority }: { className?: string; height?: number; href?: string | null; priority?: boolean }) {
  const width = Math.round((height * 480) / 94);
  const img = <Image src="/brand/bushustlers-logo-dark.png" alt="Bushustlers" width={width} height={height} priority={priority} style={{ height, width: "auto" }} />;
  return href ? (
    <Link href={href} className={cn("inline-flex shrink-0 items-center", className)} aria-label="Bushustlers home">
      {img}
    </Link>
  ) : (
    <span className={cn("inline-flex shrink-0 items-center", className)}>{img}</span>
  );
}

export function LogoOnPanel({ className, height = 22, href = null }: { className?: string; height?: number; href?: string | null }) {
  return (
    <span className={cn("inline-flex items-center rounded-xl bg-forest px-3 py-2", className)}>
      <Logo height={height} href={href} />
    </span>
  );
}

export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <span className={cn("inline-grid shrink-0 place-items-center rounded-xl bg-forest", className)} style={{ width: size, height: size }}>
      <Image src="/brand/bushustlers-symbol.png" alt="" width={Math.round(size * 0.42)} height={Math.round(size * 0.42 * (164 / 120))} style={{ height: "auto" }} />
    </span>
  );
}
