import type { AttemptStatus, FulfilmentStatus, LinkStatus, OrderPaymentStatus, OrderStatus } from "./types";

export type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "dark";

export interface StatusMeta {
  label: string;
  tone: Tone;
  hint?: string;
}

// Merchant-facing wording follows the pitch: "Don't ship yet", "Hold for review", "Safe to ship".
export const PAYMENT_STATUS: Record<OrderPaymentStatus, StatusMeta> = {
  unpaid: { label: "Awaiting payment", tone: "warning", hint: "Don't ship yet" },
  processing: { label: "Payment processing", tone: "info", hint: "Don't ship yet" },
  paid: { label: "Paid", tone: "success", hint: "Safe to ship" },
  needs_review: { label: "Needs review", tone: "danger", hint: "Hold for review" },
};

export const orderPaymentMeta = (status: OrderPaymentStatus, orderStatus: OrderStatus): StatusMeta => {
  if (status === "unpaid" && orderStatus === "draft") return { label: "Draft", tone: "neutral", hint: "No payment link yet" };
  if (status === "unpaid" && orderStatus === "expired") return { label: "Link expired", tone: "neutral", hint: "Create a new link" };
  if (status === "unpaid" && orderStatus === "cancelled") return { label: "Cancelled", tone: "neutral" };
  return PAYMENT_STATUS[status];
};

export const FULFILMENT_STATUS: Record<FulfilmentStatus, StatusMeta> = {
  unfulfilled: { label: "Not dispatched", tone: "neutral" },
  dispatched: { label: "Dispatched", tone: "dark" },
  delivered: { label: "Delivered", tone: "success" },
};

export const ATTEMPT_STATUS: Record<AttemptStatus, StatusMeta> = {
  creating: { label: "Setting up", tone: "neutral" },
  awaiting_payment: { label: "Awaiting payment", tone: "warning" },
  processing: { label: "Processing", tone: "info" },
  confirmed: { label: "Confirmed", tone: "success" },
  needs_review: { label: "Needs review", tone: "danger" },
  failed: { label: "Failed", tone: "danger" },
  expired: { label: "Expired", tone: "neutral" },
  cancelled: { label: "Closed", tone: "neutral" },
};

export const LINK_STATUS: Record<LinkStatus, StatusMeta> = {
  active: { label: "Active", tone: "success" },
  completed: { label: "Paid", tone: "dark" },
  expired: { label: "Expired", tone: "neutral" },
  disabled: { label: "Disabled", tone: "neutral" },
};

export const SETTLEMENT_STATUS: Record<"pending" | "settled" | "failed", StatusMeta> = {
  pending: { label: "Settlement pending", tone: "warning" },
  settled: { label: "Settled", tone: "success" },
  failed: { label: "Settlement failed", tone: "danger" },
};

export const MODE_LABEL: Record<string, string> = {
  demo: "Demo mode",
  sandbox: "Busha sandbox",
  production: "Live",
};
