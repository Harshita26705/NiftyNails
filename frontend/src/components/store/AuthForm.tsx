"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/bits";
import { Input } from "@/components/ui/Field";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { User } from "@/lib/types";

export function AuthForm({ onDone, initialMode = "login" }: { onDone?: (u: User) => void; initialMode?: "login" | "register" }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = mode === "login" ? await login(email, password) : await register({ email, password, full_name: name });
      onDone?.(user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Segmented value={mode} onChange={(m) => { setMode(m); setError(null); }} className="w-full [&>button]:flex-1 [&>button]:justify-center"
        options={[{ value: "login", label: "Sign in" }, { value: "register", label: "Create account" }]} />
      {mode === "register" && <Input label="Your name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} />}
      <Input label="Email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Input label="Password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password}
        onChange={(e) => setPassword(e.target.value)} required minLength={mode === "register" ? 8 : 1} maxLength={72}
        hint={mode === "register" ? "At least 8 characters, with a number or symbol." : undefined} />
      {error && <p className="text-sm font-medium text-danger" role="alert">{error}</p>}
      <Button type="submit" full size="lg" loading={busy}>{mode === "login" ? "Sign in" : "Create my account"}</Button>
    </form>
  );
}
