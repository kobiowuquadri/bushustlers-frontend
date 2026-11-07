import { cacheLife } from "next/cache";
import type { PublicConfig } from "./types";

// Fallback = the backend's documented default pricing (proposed): ₦0 setup, 1% capped at ₦1,000, 1.5% stablecoin.
const FALLBACK: PublicConfig = {
  appEnv: "development",
  paymentsMode: "demo",
  supportEmail: null,
  pricing: { status: "proposed", paidBy: "business", setupFeeMinor: "0", monthlyFeeMinor: "0", ngnBps: 100, ngnCapMinor: "100000", stablecoinBps: 150 },
  stablecoinOptions: [],
};

// Pricing shown on the website comes from the backend's fee configuration, so it always matches what the
// backend charges. Cached for an hour; if the API can't be reached at build time, the documented defaults are used.
export async function getPublicConfig(): Promise<PublicConfig> {
  "use cache";
  cacheLife("hours");
  const backend = (process.env.BACKEND_URL || "http://localhost:5000").replace(/\/+$/, "");
  try {
    const res = await fetch(`${backend}/api/v1/public/config`, { signal: AbortSignal.timeout(2500) });
    const json = (await res.json()) as { success?: boolean; data?: PublicConfig };
    if (res.ok && json.success && json.data?.pricing) return json.data;
  } catch {
    // fall through to the documented defaults
  }
  return FALLBACK;
}
