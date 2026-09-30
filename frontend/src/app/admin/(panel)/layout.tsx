import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { ToastProvider } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Nifty Admin" }, robots: { index: false } };

/** Server-side role check before any admin UI renders (the API enforces RBAC again on every call). */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const session = jar.get("nifty_session")?.value;
  if (!session) redirect("/admin/login");
  let user: User | null = null;
  try {
    user = await api<User>("/auth/me", { cookie: `nifty_session=${session}`, cache: "no-store" });
  } catch {
    redirect("/admin/login");
  }
  if (!user || user.role_name === "customer") redirect("/admin/login?denied=1");
  return (
    <ToastProvider>
      <AdminShell user={user}>{children}</AdminShell>
    </ToastProvider>
  );
}
