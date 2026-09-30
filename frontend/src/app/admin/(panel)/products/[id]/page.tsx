"use client";

import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ProductForm } from "@/components/admin/ProductForm";
import { PageHeader, useApi } from "@/components/admin/ui";
import type { ProductDetail } from "@/lib/types";

type AdminProduct = ProductDetail & { inventory: { size_label: string; quantity: number; low_stock_threshold: number }[] };

export default function EditProduct() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";
  const { data, error } = useApi<AdminProduct>(isNew ? null : `/admin/products/${id}`);
  return (
    <div>
      <Link href="/admin/products" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-2 hover:text-ink"><ArrowLeft className="size-4" /> Products</Link>
      <PageHeader title={isNew ? "New product" : data?.name ?? "…"}
        actions={data && <Link href={`/shop/${data.slug}`} target="_blank" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-pink">View in shop <ExternalLink className="size-4" /></Link>} />
      {error ? <p className="text-danger">{error}</p> : isNew ? <ProductForm key="new" product={null} /> : data ? <ProductForm key={data.id} product={data} /> : <div className="skeleton h-96 rounded-2xl" />}
    </div>
  );
}
