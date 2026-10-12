import {
  BrandStory, CreateSection, GiftSection, HowItWorks, Reviews, ShopByStyle, SizeSection, Social, StylistSection,
  Trending,
} from "@/components/home/Sections";
import { Hero } from "@/components/home/Hero";
import { apiOr } from "@/lib/api";
import type { CatalogOptions, Page, Product, Review, SiteContent } from "@/lib/types";

const EMPTY_PAGE: Page<Product> = { items: [], total: 0, page: 1, page_size: 0 };

export default async function Home() {
  const [featured, popular, all, options, reviews, site] = await Promise.all([
    apiOr<Page<Product>>("/products?featured=true&page_size=8", EMPTY_PAGE),
    apiOr<Page<Product>>("/products?sort=popular&page_size=8", EMPTY_PAGE),
    apiOr<Page<Product>>("/products?page_size=48&sort=newest", EMPTY_PAGE),
    apiOr<CatalogOptions | null>("/catalog/options", null),
    apiOr<Review[]>("/reviews/featured", []),
    apiOr<Partial<SiteContent>>("/site", {}),
  ]);

  // Hero trio: a deliberately contrasting mix; falls back to featured/popular as the catalogue changes.
  const HERO_PICKS = ["milky-pearl-glaze", "champagne-bride", "mocha-latte-marble"];
  const pool = [...featured.items, ...popular.items, ...all.items];
  const picked = HERO_PICKS.map((s) => pool.find((p) => p.slug === s)).filter((p): p is Product => !!p);
  const heroProducts = [...picked, ...featured.items.filter((p) => !HERO_PICKS.includes(p.slug))].slice(0, 3);
  const samples: Record<string, Product | undefined> = {};
  for (const cat of options?.categories ?? []) {
    samples[cat.slug] = all.items.find((p) => p.category?.slug === cat.slug && p.is_featured)
      ?? all.items.find((p) => p.category?.slug === cat.slug);
  }
  const coquette = all.items.find((p) => p.slug === "champagne-bride") ?? heroProducts[0];

  return (
    <main>
      <Hero
        title={site.hero_title ?? "Your nails, considered."}
        subtitle={site.hero_subtitle ?? "Sculpted by hand, fitted to you and made to order. Choose from the collection, or design your own and we will make it real."}
      />
      <Trending products={popular.items} />
      <ShopByStyle categories={(options?.categories ?? []).filter((c) => samples[c.slug])} samples={samples} />
      <StylistSection sample={coquette} />
      <SizeSection />
      <CreateSection />
      <BrandStory />
      <HowItWorks />
      <GiftSection sample={coquette} />
      <Reviews reviews={reviews} />
      <Social products={all.items.slice(4, 10)} handle={site.instagram_handle} />
    </main>
  );
}
