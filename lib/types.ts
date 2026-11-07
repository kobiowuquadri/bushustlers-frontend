// API contracts. Money is always a string: integer minor units (kobo) for naira,
// or an exact decimal string for stablecoin amounts. Never parse money into a float.

export type Minor = string;

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
}
export interface Paged<T> {
  items: T[];
  pagination: Pagination;
}

export interface User {
  id: number;
  email: string;
  fullName: string | null;
  emailVerified: boolean;
  createdAt: string;
}
export interface Me {
  user: User;
  business: { name: string; role: string } | null;
  onboardingComplete: boolean;
}

export type PaymentsMode = "demo" | "sandbox" | "production";

export interface StablecoinOption {
  asset: string;
  network: string;
  label: string;
  networkLabel: string;
}

export interface Environment {
  appEnv: string;
  payments: {
    provider: string;
    mode: PaymentsMode;
    bankTransfer: boolean;
    stablecoin: boolean;
    stablecoinOptions: StablecoinOption[];
    sandboxDepositSimulation: boolean;
    demoTools: boolean;
    settlementPayouts: boolean;
  };
  email: { delivery: "brevo" | "smtp" | "dev_mailbox" | "disabled" };
  fees: { ngnBps: number; ngnCapMinor: number; stablecoinBps: number; status: string };
}

export interface Business {
  name: string;
  category: string;
  categoryLabel: string;
  phone: string | null;
  orderPrefix: string;
  nextOrderReference: string;
  settlementPreference: string;
  notifications: { paymentEmails: boolean; reviewEmails: boolean };
  providerVerification: { status: "not_started" | "pending" | "verified" | "rejected"; verifiedAt: string | null };
  createdAt: string;
}
export interface BusinessResponse {
  business: Business;
  environment: Environment;
  categories: Record<string, string>;
  settlementOptions: Record<string, { label: string; available: boolean }>;
}

export type OrderStatus = "draft" | "open" | "expired" | "cancelled";
export type OrderPaymentStatus = "unpaid" | "processing" | "paid" | "needs_review";
export type FulfilmentStatus = "unfulfilled" | "dispatched" | "delivered";
export type LinkStatus = "active" | "disabled" | "expired" | "completed";
export type AttemptStatus = "creating" | "awaiting_payment" | "processing" | "confirmed" | "needs_review" | "failed" | "expired" | "cancelled";
export type Route = "bank_transfer" | "stablecoin";

export interface PaymentLink {
  id: string;
  url: string;
  status: LinkStatus;
  expiresAt: string;
  createdAt: string;
  disabledAt: string | null;
  completedAt: string | null;
}

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  handle: string | null;
  createdAt: string;
  orderCount?: number;
  totalPaidMinor?: Minor;
  lastOrderAt?: string | null;
}

export interface OrderItem {
  name: string;
  quantity: number;
  unitPriceMinor: Minor;
  lineTotalMinor: Minor;
}

export interface OrderSummary {
  id: string;
  reference: string;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  fulfilmentStatus: FulfilmentStatus;
  reviewRequired: boolean;
  currency: string;
  totalMinor: Minor;
  amountPaidMinor: Minor;
  itemSummary: string;
  itemCount: number;
  customer: { id: string; name: string } | null;
  link: PaymentLink | null;
  createdAt: string;
  paidAt: string | null;
  dispatchedAt: string | null;
  deliveredAt: string | null;
}

export interface ProviderFee {
  name: string;
  amount: string;
  currency: string;
  type?: string;
}

export interface Transaction {
  id: string;
  reference: string;
  route: Route;
  routeLabel: string;
  status: AttemptStatus;
  statusText: string;
  reviewReason: string | null;
  reviewReasonText: string | null;
  resolution: { decision: string; note: string | null; resolvedAt: string } | null;
  provider: string;
  providerMode: PaymentsMode;
  providerReference: string | null;
  providerStatus: string | null;
  currency: string;
  expectedAmountMinor: Minor;
  receivedAmountMinor: Minor | null;
  asset: string | null;
  network: string | null;
  assetAmount: string | null;
  receivedAmount: string | null;
  receivedCurrency: string | null;
  settlementAmount: string | null;
  settlementCurrency: string | null;
  rate: string | null;
  rateSource: string | null;
  providerFees: ProviderFee[];
  platformFeeMinor: Minor | null;
  order: { id: string; reference: string } | null;
  createdAt: string;
  expiresAt: string | null;
  confirmedAt: string | null;
  failedAt: string | null;
  lastCheckedAt: string | null;
}

export interface Settlement {
  id: string;
  status: "pending" | "settled" | "failed";
  currency: string;
  grossMinor: Minor;
  providerFeeMinor: Minor;
  platformFeeMinor: Minor;
  netMinor: Minor;
  feeBasis: string;
  payoutReference: string | null;
  settledAt: string | null;
  failureReason: string | null;
  simulated: boolean;
  createdAt: string;
  order: { id: string; reference: string } | null;
  payment: { id: string; route: Route; routeLabel: string } | null;
}

export interface TimelineEvent {
  action: string;
  label: string;
  actor: "user" | "buyer" | "provider" | "system";
  fromStatus: string | null;
  toStatus: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface OrderDetail extends OrderSummary {
  subtotalMinor: Minor;
  deliveryFeeMinor: Minor;
  note: string | null;
  fulfilmentNote: string | null;
  cancelledAt: string | null;
  items: OrderItem[];
  customer: Customer | null;
  links: PaymentLink[];
  payments: Transaction[];
  settlements: Settlement[];
  events: TimelineEvent[];
  editable: boolean;
  canCreateLink: boolean;
  canCancel: boolean;
  canFulfil: boolean;
  receiptAvailable: boolean;
}

export interface TransactionDetail extends Transaction {
  linkId: string | null;
  settlement: Settlement | null;
  events: TimelineEvent[];
  providerEvents: { eventType: string; status: string; receivedAt: string; processedAt: string | null }[];
  failureReason: string | null;
  actions: { canRefresh: boolean; canResolve: boolean; canSimulate: boolean; simulationKind: "demo" | "busha_sandbox" | null };
}

export interface LinkListItem extends PaymentLink {
  order: OrderSummary | null;
  latestPayment: Transaction | null;
  paymentCount: number;
}

export interface Overview {
  period: "7d" | "30d" | "90d";
  confirmedVolumeMinor: Minor;
  confirmedPaymentCount: number;
  awaitingPayment: { count: number; valueMinor: Minor };
  paidAwaitingFulfilment: number;
  needsReview: number;
  pendingSettlement: { count: number; netMinor: Minor };
  recentTransactions: Transaction[];
  environment: Environment;
}

export interface SettlementList extends Paged<Settlement> {
  summary: Record<"pending" | "settled" | "failed", { count: number; grossMinor: Minor; netMinor: Minor; platformFeeMinor: Minor }>;
  integration: { payoutsAutomated: boolean; providerMode: PaymentsMode; message: string };
}

// ---- Public checkout ------------------------------------------------------------------------
export interface BankInstructions {
  kind: "bank_transfer";
  bankName: string;
  accountNumber: string;
  accountName: string;
  amount: string;
  currency: "NGN";
  expiresAt: string | null;
  demo: boolean;
}
export interface StablecoinInstructions {
  kind: "stablecoin";
  asset: string;
  network: string;
  networkLabel: string;
  address: string;
  memo: string | null;
  amount: string;
  rate: string | null;
  rateExplained: string | null;
  rateSource: "provider_quote" | "demo";
  quoteExpiresAt: string | null;
  demo: boolean;
}

export interface BuyerPayment {
  id: string;
  route: Route;
  routeLabel: string;
  status: AttemptStatus;
  statusText: string;
  instructions: BankInstructions | StablecoinInstructions | null;
  asset: string | null;
  network: string | null;
  assetAmount: string | null;
  rate: string | null;
  rateSource: string | null;
  providerFees: ProviderFee[];
  expiresAt: string | null;
  confirmedAt: string | null;
  createdAt: string;
  lastCheckedAt: string | null;
}

export interface Checkout {
  link: { id: string; status: LinkStatus; expiresAt: string };
  merchant: { name: string };
  order: {
    reference: string;
    currency: string;
    items: OrderItem[];
    subtotalMinor: Minor;
    deliveryFeeMinor: Minor;
    totalMinor: Minor;
    paymentStatus: OrderPaymentStatus;
    cancelled: boolean;
    paidAt: string | null;
    buyerEmail: string | null;
  };
  methods: { bankTransfer: { available: boolean }; stablecoin: { available: boolean; options: StablecoinOption[] } };
  payments: BuyerPayment[];
  mode: PaymentsMode;
  receiptAvailable: boolean;
}

export interface Receipt {
  receiptNumber: string;
  merchant: { name: string };
  order: { reference: string; currency: string; items: OrderItem[]; subtotalMinor: Minor; deliveryFeeMinor: Minor; totalMinor: Minor };
  amountPaidMinor: Minor;
  paidAt: string | null;
  payments: { id: string; routeLabel: string; amountMinor: Minor; asset: string | null; network: string | null; assetAmount: string | null; providerReference: string | null; confirmedAt: string | null; mode: PaymentsMode }[];
}

export interface PublicConfig {
  appEnv: string;
  paymentsMode: PaymentsMode;
  supportEmail: string | null;
  pricing: { status: string; paidBy: string; setupFeeMinor: Minor; monthlyFeeMinor: Minor; ngnBps: number; ngnCapMinor: Minor; stablecoinBps: number };
  stablecoinOptions: StablecoinOption[];
}
