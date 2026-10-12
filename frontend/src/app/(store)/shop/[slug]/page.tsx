import { ChevronRight, Clock, Gem, Package, RotateCcw, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CharmIcon } from "@/components/nails/charms";
import { ProductCard } from "@/components/store/ProductCard";
import { ProductGallery } from "@/components/store/ProductGallery";
import { ProductPurchase } from "@/components/store/ProductPurchase";
import { Price, SectionHeading, Stars } from "@/components/ui/bits";
import { Tag } from "@/components/ui/Chip";
import { apiOr } from "@/lib/api";
import { LENGTH_LABEL, dateShort } from "@/lib/format";
import type { CatalogOptions, Product, ProductDetail, Review, SiteContent } from "@/lib/types";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await apiOr<ProductDetail | null>(`/products/${slug}`, null);
  return p ? { title: p.name, description: p.tagline || p.description.slice(0, 150) } : { title: "Design not found" };
}

function Detail({ icon: Icon, title, children }: { icon: typeof Clock; title: string; children: React.ReactNode }) {
  return (
    <details className="group border-b border-line py-4" open={title === "Details"}>
      <summary className="flex cursor-pointer list-none items-center gap-3 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
        <Icon className="size-[18px] text-pink" /> {title}
        <ChevronRight className="ml-auto size-4 text-ink-3 transition group-open:rotate-90" />
      </summary>
      <div className="pt-3 pl-[30px] text-[14px] leading-relaxed text-ink-2">{children}</div>
    </details>
  );
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const [product, related, reviews, options, site] = await Promise.all([
    apiOr<ProductDetail | null>(`/products/${slug}`, null),
    apiOr<Product[]>(`/products/${slug}/related`, []),
    apiOr<Review[]>(`/products/${slug}/reviews`, []),
    apiOr<CatalogOptions | null>("/catalog/options", null),
    apiOr<Partial<SiteContent>>("/site", {}),
  ]);
  if (!product) notFound();

  const attributes = [
    ["Shape", product.shape?.name],
    ["Length", LENGTH_LABEL[product.length]],
    ["Finish", product.finish?.name],
    ["Style", product.style?.name],
  ].filter(([, v]) => v) as [string, string][];

  return (
    <main className="mx-auto max-w-7xl px-5 pt-3 pb-12 md:px-6 md:pt-8">
      <nav aria-label="Breadcrumb" className="mb-4 hidden items-center gap-1.5 text-[13px] text-ink-2 md:flex">
        <Link href="/shop" className="hover:text-pink">Shop</Link>
        {product.category && (<><ChevronRight className="size-3.5" /><Link href={`/shop?category=${product.category.slug}`} className="hover:text-pink">{product.category.name}</Link></>)}
        <ChevronRight className="size-3.5" /><span className="text-ink">{product.name}</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-[1.1fr_1fr] md:gap-12 lg:gap-16">
        <ProductGallery product={product} />

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {product.category && <Link href={`/shop?category=${product.category.slug}`}><Tag>{product.category.name}</Tag></Link>}
            {product.tags.map((t) => <Tag key={t.slug} tone="cream">{t.name}</Tag>)}
          </div>
          <h1 className="mt-3 font-display text-[44px] leading-[1.0] uppercase md:text-[60px]">{product.name}</h1>
          <div className="mt-3 flex items-center gap-3">
            <Price paise={product.price_paise} compareAt={product.compare_at_paise} size="lg" />
            {product.rating_count > 0 && (
              <a href="#reviews" className="flex items-center gap-1.5 text-[13px] text-ink-2">
                <Stars rating={product.rating_average ?? 0} /> {product.rating_average} · {product.rating_count} review{product.rating_count > 1 ? "s" : ""}
              </a>
            )}
          </div>
          {product.tagline && <p className="mt-4 text-[16px] leading-relaxed text-ink-2">{product.tagline}</p>}

          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {attributes.map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-surface px-3.5 py-3 ring-1 ring-line">
                <p className="text-[11px] font-semibold tracking-wide text-ink-3 uppercase">{k}</p>
                <p className="mt-0.5 text-[14px] font-semibold">{v}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
            {product.colours.map((c) => (
              <span key={c.slug} className="inline-flex items-center gap-2 text-[13px] text-ink-2">
                <span className="size-4 rounded-full ring-1 ring-ink/10" style={{ background: c.hex }} />
                {c.name}{c.role === "base" && <span className="text-ink-3">(base)</span>}
              </span>
            ))}
          </div>

          <div className="mt-8">
            <ProductPurchase product={product} kits={options?.size_kits ?? []} />
          </div>

          <div className="mt-8">
            <Detail icon={Sparkles} title="Details">{product.description}</Detail>
            {product.charms.length > 0 && (
              <Detail icon={Gem} title="Charms & decorations">
                <ul className="flex flex-wrap gap-2">
                  {product.charms.map((c) => (
                    <li key={c.slug} className="inline-flex items-center gap-2 rounded-full bg-surface py-1 pr-3.5 pl-1.5 ring-1 ring-line">
                      <CharmIcon kind={c.asset_key} size={26} /> {c.name} <span className="text-ink-3">× {c.quantity}</span>
                    </li>
                  ))}
                </ul>
              </Detail>
            )}
            <Detail icon={Package} title="What's in the box">
              24 nails across sizes 0–9 (or 10 made to your sizes for custom fit), adhesive tabs, nail glue, mini file,
              cuticle stick and alcohol prep pad.
            </Detail>
            <Detail icon={Clock} title="Making & shipping">
              Ready-made kits dispatch in about 2 days. Custom-fit sets are handmade in {site.custom_lead_days ?? 7} days.
              Free shipping over ₹{((site.free_shipping_over_paise ?? 99900) / 100).toLocaleString("en-IN")}.
            </Detail>
            <Detail icon={RotateCcw} title="Care & reuse">
              Soak off gently in warm soapy water — never peel. Store in the box; with glue tabs, sets can be worn again.
            </Detail>
          </div>
        </div>
      </div>

      <section id="reviews" className="mt-16 scroll-mt-24">
        <SectionHeading title="Reviews" accent={product.rating_count ? `(${product.rating_count})` : undefined} />
        {reviews.length ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {reviews.map((r) => (
              <figure key={r.id} className="rounded-3xl bg-surface p-5 ring-1 ring-line">
                <div className="flex items-center justify-between"><Stars rating={r.rating} /><span className="text-xs text-ink-3">{dateShort(r.created_at)}</span></div>
                {r.title && <p className="mt-3 font-semibold">{r.title}</p>}
                <blockquote className="mt-1 text-[14px] leading-relaxed text-ink-2">{r.body}</blockquote>
                <figcaption className="mt-3 text-[13px] font-semibold">— {r.author_name}</figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-ink-2">No reviews yet — bought this set? Review it from your orders.</p>
        )}
      </section>

      {related.length > 0 && (
        <section className="mt-16">
          <SectionHeading title="You might" accent="also love" />
          <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-4 md:gap-x-5">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </main>
  );
}
