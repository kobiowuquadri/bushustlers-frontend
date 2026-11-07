"use client";

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ApiError } from "@/lib/api";
import { ToastProvider } from "./ui";

// When a merchant session ends (expired, revoked, or signed out elsewhere) send them to sign-in once.
const handleSessionEnd = (error: unknown) => {
  if (typeof window === "undefined") return;
  if (!(error instanceof ApiError) || error.status !== 401) return;
  if (error.code !== "session_ended" && error.code !== "unauthenticated") return;
  const path = window.location.pathname;
  if (!path.startsWith("/dashboard") && !path.startsWith("/onboarding")) return;
  window.location.replace(`/sign-in?expired=1&next=${encodeURIComponent(path)}`);
};

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({ onError: handleSessionEnd }),
        mutationCache: new MutationCache({ onError: handleSessionEnd }),
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            refetchOnWindowFocus: true,
            // Retry network blips and server errors, never auth/validation/not-found responses
            retry: (count, error) => count < 2 && (!(error instanceof ApiError) || error.status === 0 || error.status >= 500),
          },
          mutations: { retry: false },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}
