"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "./api";
import type { User } from "./types";

type AuthCtx = {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<User>;
  register: (data: { email: string; password: string; full_name: string; phone?: string }) => Promise<User>;
  logout: () => Promise<void>;
  favourites: Set<number>;
  toggleFavourite: (productId: number) => Promise<boolean>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [favourites, setFavourites] = useState<Set<number>>(new Set());

  const loadFavourites = useCallback(async () => {
    try {
      setFavourites(new Set(await api<number[]>("/me/favourites/ids")));
    } catch {
      setFavourites(new Set());
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const { user: me } = await api<{ user: User | null }>("/auth/session");
      setUser(me);
      if (me) void loadFavourites();
    } catch (e) {
      if (!(e instanceof ApiError) || e.status === 401) setUser(null);
    } finally {
      setLoading(false);
    }
  }, [loadFavourites]);

  // Initial session check: state is only set from the async result.
  useEffect(() => {
    let alive = true;
    api<{ user: User | null }>("/auth/session")
      .then(({ user: me }) => {
        if (!alive) return;
        setUser(me);
        if (me) void loadFavourites();
      })
      .catch(() => undefined)
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [loadFavourites]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<{ user: User }>("/auth/login", { method: "POST", body: { email, password } });
    setUser(res.user);
    void loadFavourites();
    return res.user;
  }, [loadFavourites]);

  const register = useCallback(async (data: { email: string; password: string; full_name: string; phone?: string }) => {
    const res = await api<{ user: User }>("/auth/register", { method: "POST", body: data });
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    await api("/auth/logout", { method: "POST" }).catch(() => undefined);
    setUser(null);
    setFavourites(new Set());
  }, []);

  const toggleFavourite = useCallback(async (productId: number) => {
    const has = favourites.has(productId);
    const next = new Set(favourites);
    if (has) next.delete(productId);
    else next.add(productId);
    setFavourites(next); // optimistic
    try {
      await api(`/me/favourites/${productId}`, { method: has ? "DELETE" : "PUT" });
      return !has;
    } catch (e) {
      setFavourites(favourites);
      throw e;
    }
  }, [favourites]);

  const value = useMemo(
    () => ({ user, loading, refresh, login, register, logout, favourites, toggleFavourite }),
    [user, loading, refresh, login, register, logout, favourites, toggleFavourite],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
