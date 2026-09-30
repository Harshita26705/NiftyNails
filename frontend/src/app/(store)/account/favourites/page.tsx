"use client";

import { Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { ProductCard } from "@/components/store/ProductCard";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/bits";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Product } from "@/lib/types";

export default function Favourites() {
  const { favourites } = useAuth();
  const [items, setItems] = useState<Product[] | null>(null);
  useEffect(() => { api<Product[]>("/me/favourites").then(setItems).catch(() => setItems([])); }, []);
  const visible = items?.filter((p) => favourites.has(p.id));
  if (!visible) return <div className="skeleton h-48 rounded-3xl" />;
  if (!visible.length) return <EmptyState icon={<Heart className="size-7" />} title="No favourites yet" body="Tap the heart on any design to save it here." action={<ButtonLink href="/shop">Browse designs</ButtonLink>} />;
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-4 md:gap-x-5">
      {visible.map((p) => <ProductCard key={p.id} product={p} />)}
    </div>
  );
}
