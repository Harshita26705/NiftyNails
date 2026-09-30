"use client";

import { ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Logo } from "@/components/store/Logo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { api, ApiError } from "@/lib/api";
import type { User } from "@/lib/types";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(params.get("denied") ? "That account doesn't have admin access." : null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { user } = await api<{ user: User }>("/auth/login", { method: "POST", body: { email, password } });
      if (user.role_name === "customer") {
        await api("/auth/logout", { method: "POST" });
        setError("That account doesn't have admin access.");
        return;
      }
      const next = params.get("next");
      router.replace(next?.startsWith("/admin") ? next : "/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-[2rem] bg-surface p-7 shadow-soft ring-1 ring-line">
      <div className="mb-2 flex items-center justify-between"><Logo href="/" /><span className="rounded-full bg-ink px-2.5 py-1 text-[10px] font-bold tracking-widest text-white">ADMIN</span></div>
      <Input label="Email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Input label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      {error && <p className="text-sm font-medium text-danger" role="alert">{error}</p>}
      <Button type="submit" full size="lg" variant="ink" loading={busy}>Sign in</Button>
      <p className="flex items-center justify-center gap-1.5 text-[12px] text-ink-3"><ShieldCheck className="size-3.5" /> Staff & admin accounts only</p>
    </form>
  );
}

export default function AdminLogin() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-blush-50 px-5">
      <Suspense><LoginForm /></Suspense>
    </main>
  );
}
