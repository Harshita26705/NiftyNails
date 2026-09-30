import { SearchX, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ProductCard } from "@/components/store/ProductCard";
import { ShopFilters, SortSelect } from "@/components/store/ShopFilters";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/bits";
import { apiOr } from "@/lib/api";
import type { CatalogOptions, Page, Product } from "@/lib/types";

export const metadata: Metadata = { title: "Shop press-on nail designs" };

type Search = Record<string, string | string[] | undefined>;
const PASS = ["q", "category", "style", "shape", "finish", "colour", "charm", "occasion", "length", "min_price", "max_price", "sort"];
const STEP = 24;

export default async function ShopPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const pageSize = Math.min(Number(sp.show ?? STEP) || STEP, 48);
  const query: Record<string, string> = { page_size: String(pageSize) };
  for (const k of PASS) {
    const v = sp[k];
    if (typeof v === "string" && v) query[k] = v;
  }
  const [data, options] = await Promise.all([
    apiOr<Page<Product>>(`/products?${new URLSearchParams(query)}`, { items: [], total: 0, page: 1, page_size: pageSize }),
    apiOr<CatalogOptions | null>("/catalog/options", null),
  ]);
  const activeCategory = options?.categories.find((c) => c.slug === sp.category);
  const moreParams = new URLSearchParams({ ...query, show: String(pageSize + STEP) });
  moreParams.delete("page_size");

  return (
    <main className="mx-auto max-w-7xl px-5 pt-6 md:px-6 md:pt-10">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-bold tracking-[0.18em] text-pink uppercase">Shop</p>
          <h1 className="mt-1.5 font-display text-[36px] leading-none tracking-[-0.02em] md:text-[52px]">
            {activeCategory ? activeCategory.name : <>All <em className="text-pink italic">designs</em></>}
          </h1>
          <p className="mt-2 text-sm text-ink-2">{data.total} handmade {data.total === 1 ? "set" : "sets"}</p>
        </div>
        <div className="hidden items-center gap-3 lg:flex">
          <Link href="/stylist" className="inline-flex items-center gap-1.5 text-sm font-semibold text-pink">
            <Sparkles className="size-4" /> Describe what you want instead
          </Link>
          <Suspense><SortSelect /></Suspense>
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:mt-8 lg:grid-cols-[250px_1fr] lg:gap-10">
        {options && (
          <Suspense>
            <ShopFilters options={options} total={data.total} />
          </Suspense>
        )}
        <section aria-label="Designs" className="min-w-0">
          {data.items.length ? (
            <>
              <div className="grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-3 md:gap-x-5 md:gap-y-10">
                {data.items.map((p, i) => <ProductCard key={p.id} product={p} priority={i < 4} />)}
              </div>
              {data.total > data.items.length && (
                <div className="mt-12 flex flex-col items-center gap-2">
                  <p className="text-xs text-ink-3">Showing {data.items.length} of {data.total}</p>
                  <ButtonLink href={`/shop?${moreParams}`} variant="secondary" scroll={false}>Show more designs</ButtonLink>
                </div>
              )}
            </>
          ) : (
            <EmptyState icon={<SearchX className="size-7" />} title="No designs match — yet"
              body="Try removing a filter, or describe what you want and we'll find the closest thing we make (or create it for you)."
              action={<div className="flex flex-wrap justify-center gap-2">
                <ButtonLink href="/shop" variant="secondary">Clear filters</ButtonLink>
                <ButtonLink href="/create" icon={<Sparkles className="size-4" />}>Design it custom</ButtonLink>
              </div>} />
          )}
        </section>
      </div>
    </main>
  );
}
