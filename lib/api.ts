// Typed client for the Bushustlers API. Same-origin requests (proxied to the backend by next.config.ts),
// session cookies are HttpOnly, and state-changing requests echo the CSRF cookie in X-CSRF-Token.

const BASE = "/api/v1";

export interface FieldError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code: string | null = null,
    readonly fieldErrors: FieldError[] = [],
    readonly requestId: string | null = null,
  ) {
    super(message);
    this.name = "ApiError";
  }
  get isNetwork() {
    return this.status === 0;
  }
  fieldError(field: string) {
    return this.fieldErrors.find((e) => e.field === field)?.message;
  }
}

const readCookie = (suffix: string) => {
  if (typeof document === "undefined") return null;
  for (const part of document.cookie.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === suffix || name === `__Host-${suffix}`) return decodeURIComponent(rest.join("="));
  }
  return null;
};

const ensureCsrf = async () => {
  if (readCookie("bh_csrf")) return;
  await fetch(`${BASE}/auth/csrf`, { credentials: "same-origin" }).catch(() => undefined);
};

// One refresh at a time, shared by every request that hits an expired access token
let refreshing: Promise<boolean> | null = null;
const refreshSession = () => {
  refreshing ??= (async () => {
    try {
      await ensureCsrf();
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "X-CSRF-Token": readCookie("bh_csrf") || "" },
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      setTimeout(() => (refreshing = null), 0);
    }
  })();
  return refreshing;
};

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export async function api<T>(path: string, options: RequestOptions = {}, retried = false): Promise<T> {
  const method = options.method || "GET";
  if (method !== "GET") await ensureCsrf();
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      credentials: "same-origin",
      signal: options.signal,
      headers: {
        Accept: "application/json",
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(method !== "GET" ? { "X-CSRF-Token": readCookie("bh_csrf") || "" } : {}),
        ...options.headers,
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, "We couldn't reach Bushustlers. Check your connection and try again.", "network_error");
  }

  const json = (await res.json().catch(() => null)) as { success?: boolean; message?: string; data?: Record<string, unknown> } | null;
  const code = typeof json?.data?.code === "string" ? json.data.code : null;

  if (res.status === 401 && code === "access_expired" && !retried) {
    if (await refreshSession()) return api<T>(path, options, true);
  }
  if (res.status === 403 && code === "csrf_failed" && !retried) {
    await fetch(`${BASE}/auth/csrf`, { credentials: "same-origin" }).catch(() => undefined);
    return api<T>(path, options, true);
  }
  if (!res.ok || !json?.success) {
    const message = json?.message || (res.status >= 500 ? "Something went wrong on our side. Please try again." : "Request failed");
    const errors = Array.isArray(json?.data?.errors) ? (json!.data!.errors as FieldError[]) : [];
    const requestId = typeof json?.data?.requestId === "string" ? json.data.requestId : res.headers.get("x-request-id");
    throw new ApiError(res.status, message, code, errors, requestId);
  }
  return json.data as T;
}

export const isUnauthenticated = (error: unknown) =>
  error instanceof ApiError && error.status === 401;

export const newIdempotencyKey = () => {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return `ck_${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
};
