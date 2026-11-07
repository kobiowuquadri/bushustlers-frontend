"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Eye, EyeOff, MailCheck } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Me } from "@/lib/types";
import { Button, ButtonLink, Field, Input, Notice, Spinner } from "./ui";

const PASSWORD_RULE = "Use 8 or more characters with an uppercase letter, a lowercase letter, a number and a symbol.";
const strongPassword = (value: string) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,72}$/.test(value);

// Only allow same-site relative redirects after sign-in
const safeNext = (value: string | null) => (value && value.startsWith("/") && !value.startsWith("//") ? value : null);

function PasswordInput({ id, value, onChange, autoComplete, invalid }: { id: string; value: string; onChange: (value: string) => void; autoComplete: string; invalid?: boolean }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input id={id} type={visible ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} className="pr-11" aria-invalid={invalid} />
      <button type="button" onClick={() => setVisible((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted hover:text-ink" aria-label={visible ? "Hide password" : "Show password"}>
        {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </button>
    </div>
  );
}

const errorsFrom = (error: unknown) => {
  const fields: Record<string, string> = {};
  if (error instanceof ApiError) for (const e of error.fieldErrors) fields[e.field] = e.message;
  return fields;
};

export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const next = safeNext(params.get("next"));

  const signIn = useMutation({
    mutationFn: () => api<{ user: Me["user"] }>("/auth/login", { method: "POST", body: { email, password } }),
    onSuccess: async () => {
      const me = await queryClient.fetchQuery({ queryKey: ["me"], queryFn: () => api<Me>("/auth/me"), staleTime: 0 });
      router.replace(me.onboardingComplete ? next || "/dashboard" : "/onboarding");
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Couldn't sign in. Try again."),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!email.trim() || !password) return setError("Enter your email and password.");
    signIn.mutate();
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
        <p className="mt-1.5 text-muted">Welcome back. Check what&apos;s paid and what&apos;s ready to ship.</p>
      </div>
      {params.get("expired") ? <Notice tone="info">Your session ended. Sign in again to continue.</Notice> : null}
      {params.get("reset") ? <Notice tone="success">Password updated. Sign in with your new password.</Notice> : null}
      <Field label="Email" htmlFor="email">
        <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </Field>
      <Field label="Password" htmlFor="password">
        <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="current-password" />
      </Field>
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm font-semibold text-ink underline-offset-2 hover:underline">
          Forgot password?
        </Link>
      </div>
      {error ? <Notice tone="danger">{error}</Notice> : null}
      <Button type="submit" size="lg" className="w-full" loading={signIn.isPending}>
        Sign in
      </Button>
      <p className="text-center text-sm text-muted">
        New to Bushustlers?{" "}
        <Link href="/sign-up" className="font-semibold text-ink underline-offset-2 hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function SignUpForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const signUp = useMutation({
    mutationFn: () => api("/auth/register", { method: "POST", body: form }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      router.replace("/onboarding");
    },
    onError: (err) => {
      setErrors(errorsFrom(err));
      setError(err instanceof ApiError ? err.message : "Couldn't create your account. Try again.");
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const next: Record<string, string> = {};
    if (form.fullName.trim().length < 2) next.fullName = "Enter your full name";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Enter a valid email address";
    if (!strongPassword(form.password)) next.password = PASSWORD_RULE;
    setErrors(next);
    if (!Object.keys(next).length) signUp.mutate();
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
        <p className="mt-1.5 text-muted">Free to start. No setup or monthly fee.</p>
      </div>
      <Field label="Your full name" htmlFor="fullName" error={errors.fullName}>
        <Input id="fullName" autoComplete="name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} aria-invalid={Boolean(errors.fullName)} />
      </Field>
      <Field label="Email" htmlFor="email" error={errors.email}>
        <Input id="email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} aria-invalid={Boolean(errors.email)} />
      </Field>
      <Field label="Password" htmlFor="password" error={errors.password} hint={PASSWORD_RULE}>
        <PasswordInput id="password" value={form.password} onChange={(password) => setForm({ ...form, password })} autoComplete="new-password" invalid={Boolean(errors.password)} />
      </Field>
      {error ? <Notice tone="danger">{error}</Notice> : null}
      <Button type="submit" size="lg" className="w-full" loading={signUp.isPending}>
        Create account
      </Button>
      <p className="text-center text-xs text-muted">
        By creating an account you agree to the draft <Link href="/legal/terms" className="underline">Terms</Link> and <Link href="/legal/privacy" className="underline">Privacy notice</Link>.
      </p>
      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-semibold text-ink underline-offset-2 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const request = useMutation({
    mutationFn: () => api<Record<string, never>>("/auth/forgot-password", { method: "POST", body: { email } }),
    onSuccess: () => setSent(email),
    onError: (err) => setError(err instanceof ApiError ? err.message : "Couldn't send the link. Try again."),
  });

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <MailCheck className="mx-auto size-10 text-success" aria-hidden />
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="text-muted">If an account exists for {sent}, we sent a link to reset the password. It expires in 30 minutes.</p>
        <ButtonLink href="/sign-in" variant="secondary">
          Back to sign in
        </ButtonLink>
      </div>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email address.");
        request.mutate();
      }}
      noValidate
      className="space-y-5"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reset your password</h1>
        <p className="mt-1.5 text-muted">Enter your account email and we&apos;ll send a reset link.</p>
      </div>
      <Field label="Email" htmlFor="email">
        <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      {error ? <Notice tone="danger">{error}</Notice> : null}
      <Button type="submit" size="lg" className="w-full" loading={request.isPending}>
        Send reset link
      </Button>
      <p className="text-center text-sm">
        <Link href="/sign-in" className="font-semibold text-ink underline-offset-2 hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const reset = useMutation({
    mutationFn: () => api("/auth/reset-password", { method: "POST", body: { token, password } }),
    onSuccess: () => router.replace("/sign-in?reset=1"),
    onError: (err) => setError(err instanceof ApiError ? err.message : "Couldn't reset the password. Try again."),
  });
  if (!token) {
    return (
      <Notice tone="danger" title="This reset link is incomplete">
        Open the link from your email again, or <Link href="/forgot-password" className="underline">request a new one</Link>.
      </Notice>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        if (!strongPassword(password)) return setError(PASSWORD_RULE);
        if (password !== confirm) return setError("The two passwords don't match.");
        reset.mutate();
      }}
      noValidate
      className="space-y-5"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Choose a new password</h1>
        <p className="mt-1.5 text-muted">You&apos;ll be signed out on every device and can sign in with the new password.</p>
      </div>
      <Field label="New password" htmlFor="password" hint={PASSWORD_RULE}>
        <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="new-password" />
      </Field>
      <Field label="Confirm new password" htmlFor="confirm">
        <PasswordInput id="confirm" value={confirm} onChange={setConfirm} autoComplete="new-password" />
      </Field>
      {error ? <Notice tone="danger">{error}</Notice> : null}
      <Button type="submit" size="lg" className="w-full" loading={reset.isPending}>
        Update password
      </Button>
    </form>
  );
}

export function VerifyEmail() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const queryClient = useQueryClient();
  const started = useRef(false);
  const verify = useMutation({
    mutationFn: () => api("/auth/verify-email", { method: "POST", body: { token } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  });
  const { mutate } = verify;
  useEffect(() => {
    if (token && !started.current) {
      started.current = true;
      mutate();
    }
  }, [token, mutate]);

  if (!token || verify.isError) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">We couldn&apos;t confirm your email</h1>
        <Notice tone="danger">{verify.error instanceof ApiError ? verify.error.message : "This link is incomplete. Open it from your email again."}</Notice>
        <ButtonLink href="/dashboard" variant="secondary">
          Go to dashboard
        </ButtonLink>
      </div>
    );
  }
  if (verify.isSuccess) {
    return (
      <div className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden />
        <h1 className="text-2xl font-bold">Email confirmed</h1>
        <p className="text-muted">Thanks. Your account email is confirmed.</p>
        <ButtonLink href="/dashboard">Go to dashboard</ButtonLink>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 text-muted">
      <Spinner /> Confirming your email…
    </div>
  );
}
