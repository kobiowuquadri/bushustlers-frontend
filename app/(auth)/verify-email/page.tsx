import type { Metadata } from "next";
import { Suspense } from "react";
import { VerifyEmail } from "@/components/auth-forms";
import { Spinner } from "@/components/ui";

export const metadata: Metadata = { title: "Confirm email" };

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <VerifyEmail />
    </Suspense>
  );
}
