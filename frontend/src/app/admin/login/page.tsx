"use client";

import { ShieldCheck, User as UserIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Logo } from "@/components/store/Logo";
import { Button } from "@/components/ui/Button";
import { api, ApiError } from "@/lib/api";
import type { User } from "@/lib/types";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(params.get("denied") ? "That account doesn't have admin access." : null);
  const [busy, setBusy] = useState<"admin" | "customer" | null>(null);

  const loginAs = async (role: "admin" | "customer") => {
    setBusy(role);
    setError(null);
    try {
      await api<{ user: User }>("/auth/demo-login", { method: "POST", body: { role } });
      if (role === "customer") {
        router.replace("/");
        router.refresh();
        return;
      }
      const next = params.get("next");
      router.replace(next?.startsWith("/admin") ? next : "/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="w-full max-w-sm space-y-4 rounded-[0.75rem] bg-surface p-7 shadow-soft ring-1 ring-line">
      <div className="mb-2 flex items-center justify-between"><Logo href="/" /><span className="rounded-full bg-ink px-2.5 py-1 text-[10px] font-bold tracking-widest text-white">ADMIN</span></div>
      {error && <p className="text-sm font-medium text-danger" role="alert">{error}</p>}
      <Button type="button" full size="lg" variant="ink" loading={busy === "admin"} disabled={busy === "customer"}
        icon={<ShieldCheck className="size-4" />} onClick={() => loginAs("admin")}>
        Login as admin
      </Button>
      <Button type="button" full size="lg" variant="secondary" loading={busy === "customer"} disabled={busy === "admin"}
        icon={<UserIcon className="size-4" />} onClick={() => loginAs("customer")}>
        Login as customer
      </Button>
      <p className="flex items-center justify-center gap-1.5 text-[12px] text-ink-3"><ShieldCheck className="size-3.5" /> Demo access — no password required</p>
    </div>
  );
}

export default function AdminLogin() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-blush-50 px-5">
      <Suspense><LoginForm /></Suspense>
    </main>
  );
}
