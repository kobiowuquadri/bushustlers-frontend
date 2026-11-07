import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Bushustlers — Payment links that confirm your sales",
    template: "%s · Bushustlers",
  },
  description:
    "Create a payment link, accept supported local and international payments, and see exactly which orders are paid. Built for Instagram and WhatsApp sellers in Nigeria.",
  applicationName: "Bushustlers",
};

export const viewport: Viewport = {
  themeColor: "#08281F",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-NG" className="h-full">
      <body className="flex min-h-full flex-col antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
