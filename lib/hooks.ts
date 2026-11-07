"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "./api";
import type { BusinessResponse, Me } from "./types";

export const useMe = () => useQuery({ queryKey: ["me"], queryFn: () => api<Me>("/auth/me"), staleTime: 60_000, retry: false });

export const useBusiness = (enabled = true) => useQuery({ queryKey: ["business"], queryFn: () => api<BusinessResponse>("/business"), enabled, staleTime: 60_000 });

// Ticks every second while mounted, for countdowns
export const useNow = (intervalMs = 1000) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
};

// Bounded polling: refresh every `everyMs` while `active`, stopping for good after `maxMs`
export const useBoundedPolling = (active: boolean, everyMs: number, maxMs: number) => {
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setTimedOut(true), maxMs);
    return () => clearTimeout(timer);
  }, [active, maxMs]);
  return active && !timedOut ? everyMs : (false as const);
};
