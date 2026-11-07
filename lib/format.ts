// Formatting without floating point: minor-unit strings are split with BigInt.

const groupFormatter = new Intl.NumberFormat("en-NG");

export const formatNaira = (minor: string | null | undefined, { showKobo = "auto" }: { showKobo?: "auto" | "always" } = {}) => {
  if (minor === null || minor === undefined || minor === "") return "—";
  let value: bigint;
  try {
    value = BigInt(minor);
  } catch {
    return "—";
  }
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const whole = groupFormatter.format(abs / 100n);
  const kobo = abs % 100n;
  const fraction = kobo || showKobo === "always" ? `.${kobo.toString().padStart(2, "0")}` : "";
  return `${negative ? "−" : ""}₦${whole}${fraction}`;
};

// Exact asset amounts, e.g. "30.000000" USDT -> "30.00"; keeps all significant decimals the provider gave
export const formatAsset = (amount: string | null | undefined, asset?: string | null, minDecimals = 2) => {
  if (!amount) return "—";
  const [whole, fraction = ""] = amount.split(".");
  let trimmed = fraction.replace(/0+$/, "");
  if (trimmed.length < minDecimals) trimmed = trimmed.padEnd(minDecimals, "0");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${grouped}${trimmed ? `.${trimmed}` : ""}${asset ? ` ${asset}` : ""}`;
};

// "45,000.50" -> "4500050". Returns null for anything that is not a valid naira amount.
export const parseNairaToMinor = (input: string): string | null => {
  const cleaned = input.replace(/[₦,\s]/g, "");
  if (!/^\d{1,11}(\.\d{0,2})?$/.test(cleaned)) return null;
  const [whole, fraction = ""] = cleaned.split(".");
  const minor = BigInt(whole) * 100n + BigInt((fraction + "00").slice(0, 2));
  return minor.toString();
};

export const minorToInput = (minor: string | null | undefined) => {
  if (!minor) return "";
  const value = BigInt(minor);
  const kobo = value % 100n;
  return `${value / 100n}${kobo ? `.${kobo.toString().padStart(2, "0")}` : ""}`;
};

export const sumMinor = (values: (string | bigint)[]) => values.reduce<bigint>((sum, v) => sum + BigInt(v), 0n).toString();

const dateTime = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" });
const dateOnly = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" });

export const formatDateTime = (value: string | null | undefined) => (value ? dateTime.format(new Date(value)) : "—");
export const formatDate = (value: string | null | undefined) => (value ? dateOnly.format(new Date(value)) : "—");

export const formatRelative = (value: string | null | undefined, now = Date.now()) => {
  if (!value) return "—";
  const diff = new Date(value).getTime() - now;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (abs < 60_000) return diff >= 0 ? "in under a minute" : "just now";
  if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), "minute");
  if (abs < 86_400_000) return rtf.format(Math.round(diff / 3_600_000), "hour");
  return rtf.format(Math.round(diff / 86_400_000), "day");
};

export const formatCountdown = (target: string | null | undefined, now: number) => {
  if (!target) return null;
  const ms = new Date(target).getTime() - now;
  if (ms <= 0) return "00:00";
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

export const percentFromBps = (bps: number) => `${bps / 100}%`;

export const initials = (name: string | null | undefined) =>
  (name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
