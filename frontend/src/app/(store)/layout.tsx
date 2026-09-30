import { BottomNav } from "@/components/store/BottomNav";
import { HideInFocus } from "@/components/store/FocusAware";
import { Footer } from "@/components/store/Footer";
import { Header } from "@/components/store/Header";
import { ToastProvider } from "@/components/ui/Toast";
import { apiOr } from "@/lib/api";
import { AuthProvider } from "@/lib/auth";
import { CartProvider } from "@/lib/cart";
import type { SiteContent } from "@/lib/types";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const site = await apiOr<Partial<SiteContent>>("/site", {});
  return (
    <AuthProvider>
      <CartProvider>
        <ToastProvider>
          <Header announcement={site.announcement} />
          <div className="min-h-[60vh]">{children}</div>
          <HideInFocus>
            <Footer instagram={site.instagram_handle} email={site.support_email} />
          </HideInFocus>
          <BottomNav />
        </ToastProvider>
      </CartProvider>
    </AuthProvider>
  );
}
