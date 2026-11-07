"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { ExternalLink, MessageCircle, QrCode } from "lucide-react";
import { formatNaira, formatRelative } from "@/lib/format";
import { LINK_STATUS } from "@/lib/status";
import type { PaymentLink } from "@/lib/types";
import { Button, buttonClass, CopyButton, StatusPill } from "./ui";

export const whatsappShareUrl = ({ url, reference, totalMinor, businessName, customerName, phone }: { url: string; reference: string; totalMinor: string; businessName?: string; customerName?: string | null; phone?: string | null }) => {
  const greeting = customerName ? `Hi ${customerName.split(" ")[0]}, here` : "Here";
  const text = `${greeting} is your payment link for order ${reference} (${formatNaira(totalMinor)})${businessName ? ` from ${businessName}` : ""}: ${url}\nWe'll confirm as soon as your payment is verified.`;
  // wa.me expects the number in international format without "+"
  const digits = phone?.replace(/[^\d]/g, "");
  return `https://wa.me/${digits ? digits : ""}?text=${encodeURIComponent(text)}`;
};

export function QrCodeImage({ value, size = 184, label }: { value: string; size?: number; label: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, { margin: 1, width: size * 2, color: { dark: "#08281F", light: "#FFFFFF" }, errorCorrectionLevel: "M" })
      .then((url) => !cancelled && setSrc(url))
      .catch(() => !cancelled && setSrc(null));
    return () => {
      cancelled = true;
    };
  }, [value, size]);
  return src ? (
    <Image src={src} alt={label} width={size} height={size} unoptimized className="rounded-xl border border-line bg-paper p-1" />
  ) : (
    <div className="animate-pulse rounded-xl bg-ivory-2" style={{ width: size, height: size }} aria-hidden />
  );
}

export function ShareLinkPanel({
  link,
  reference,
  totalMinor,
  businessName,
  customerName,
  customerPhone,
  onDisable,
  disabling,
  highlight,
}: {
  link: PaymentLink;
  reference: string;
  totalMinor: string;
  businessName?: string;
  customerName?: string | null;
  customerPhone?: string | null;
  onDisable?: () => void;
  disabling?: boolean;
  highlight?: boolean;
}) {
  const [showQr, setShowQr] = useState(false);
  const active = link.status === "active";
  return (
    <div className={highlight ? "rounded-2xl ring-2 ring-mint ring-offset-2 ring-offset-paper" : ""}>
      <div className="flex items-center justify-between gap-2">
        <StatusPill meta={LINK_STATUS[link.status]} />
        <span className="text-xs text-muted">{active ? `Expires ${formatRelative(link.expiresAt)}` : link.status === "expired" ? `Expired ${formatRelative(link.expiresAt)}` : null}</span>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-line bg-ivory/60 p-2 pl-3">
        <code className="min-w-0 flex-1 truncate font-mono text-xs text-ink" title={link.url}>
          {link.url}
        </code>
        <CopyButton value={link.url} label="Copy" />
      </div>
      {active ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <a
            href={whatsappShareUrl({ url: link.url, reference, totalMinor, businessName, customerName, phone: customerPhone })}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass("dark", "sm")}
          >
            <MessageCircle className="size-4" aria-hidden />
            WhatsApp
          </a>
          <a href={link.url} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "sm")}>
            <ExternalLink className="size-4" aria-hidden />
            Preview
          </a>
          <Button variant="secondary" size="sm" onClick={() => setShowQr((v) => !v)} icon={<QrCode className="size-4" aria-hidden />} aria-expanded={showQr}>
            {showQr ? "Hide QR" : "QR code"}
          </Button>
          {onDisable ? (
            <Button variant="danger" size="sm" onClick={onDisable} loading={disabling}>
              Disable link
            </Button>
          ) : null}
        </div>
      ) : null}
      {showQr && active ? (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl bg-ivory/60 p-4">
          <QrCodeImage value={link.url} label={`QR code for the ${reference} payment link`} />
          <p className="text-center text-xs text-muted">Scans to the same checkout link. Useful for in-person or printed orders.</p>
        </div>
      ) : null}
    </div>
  );
}
