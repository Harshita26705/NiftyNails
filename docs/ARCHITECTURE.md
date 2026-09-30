# Nifty Nails — Platform Architecture

> Premium nail brand + e-commerce store + AI nail stylist + custom design studio + computer-vision sizing.
> Built ₹0-first: every runtime feature works with free/open-source components and no paid AI API.

---

## 1. System overview

```
                ┌──────────────────────────────────────────────────────────┐
  Browser  ───▶ │  Next.js (App Router, TS, Tailwind)  :3100               │
  (mobile-      │   • customer storefront  /  /shop  /create  /size ...    │
   first)       │   • admin app            /admin/*  (server-side RBAC     │
                │                                     gate + API RBAC)     │
                │   • /api/*  ──rewrite──▶  FastAPI  (same-origin cookies) │
                └───────────────────────────────┬──────────────────────────┘
                                                │
                ┌───────────────────────────────▼──────────────────────────┐
                │  FastAPI  :8000   (Pydantic v2, SQLAlchemy 2, Alembic)   │
                │   api/  → routers (thin)                                 │
                │   services/ → business rules (pricing, orders, BOM ...)  │
                │   ml/   → text parsing, embeddings, colour analysis,     │
                │           nail sizing (OpenCV + MediaPipe)               │
                │   storage/ → local disk (S3-compatible adapter later)    │
                └───────────────┬───────────────────────────┬──────────────┘
                                │                           │
                        PostgreSQL 16                 media/ (uploads,
                        (Docker locally)              re-encoded WebP)
```

**Key principles**

| Principle | How it is enforced |
|---|---|
| Catalogue is the source of truth | Every AI feature ranks/validates against DB rows (products, colours, finishes, charms, shapes). Unknown requests produce "we don't offer X — closest is Y". |
| Server owns prices | Cart lines are re-priced server-side at checkout; custom designs are priced by `services/pricing.py` from admin-editable pricing settings. |
| Manufacturable designs | Custom designs are stored as structured JSON **and** normalised into `custom_design_elements` (a bill of materials: charm × qty, colours, finish, shape). |
| RBAC, not hidden pages | Every `/api/v1/admin/*` route depends on `require_admin`. The Next.js `/admin` layout also verifies the session server-side before rendering. |
| Works without external AI | All AI features are deterministic/local by default. Optional providers plug into interfaces (`EmbeddingProvider`, `LLMProvider`). |
| Privacy | Hand photos for sizing are processed in memory and never written to disk. Uploaded images are re-encoded (EXIF stripped). |

---

## 2. Folder structure

```
Nifty/
├── docker-compose.yml          # PostgreSQL for local dev
├── docs/ARCHITECTURE.md
├── backend/
│   ├── alembic/                # migrations
│   ├── app/
│   │   ├── main.py             # app factory, CORS, routers, media
│   │   ├── core/               # config, security (hashing/JWT), logging, rate limit, errors
│   │   ├── db/                 # engine/session, declarative base
│   │   ├── models/             # SQLAlchemy models, one module per domain
│   │   ├── schemas/            # Pydantic request/response models
│   │   ├── services/           # business logic (pricing, orders, catalogue, gifting, analytics ...)
│   │   ├── ml/                 # attribute parser, embeddings, colour analysis, sizing CV
│   │   ├── storage/            # file storage abstraction + image validation
│   │   ├── api/
│   │   │   ├── deps.py         # auth dependencies (current_user, require_admin)
│   │   │   └── v1/             # public, account and admin routers
│   │   └── seed/               # demo catalogue + admin bootstrap
│   └── tests/                  # pytest unit + integration tests (SQLite in-memory)
└── frontend/
    └── src/
        ├── app/
        │   ├── (store)/        # customer routes (home, shop, create, size, gift, cart, account ...)
        │   └── admin/          # admin app (own layout, desktop-first)
        ├── components/
        │   ├── ui/             # design-system primitives
        │   ├── nails/          # NailSetArt (procedural SVG renders), shapes, charms
        │   ├── editor/         # Draw-your-own editor (canvas + charm layer)
        │   ├── store/ admin/   # feature components
        └── lib/                # api client, types, cart store, auth, formatting
```

---

## 3. Database schema (PostgreSQL)

```
roles ──< users ──< saved_designs >── custom_designs ──< custom_design_elements >── charms
                │                          │
                ├──< orders ──< order_items ──< order_customizations
                │        │          │
                │        │          └── product / custom_design / gift_bundle
                ├──< favourites >── products
                ├──< nail_measurements
                └──< reviews >── products

categories ──< products ──< product_images
               products >──< colours      (product_colours, with role: base/accent)
               products >──< charms       (product_charms, with quantity)
               products >──< tags / patterns / occasions (M2M)
               products >── finishes, nail_shapes, styles
               products ──< inventory (per size set) ;  products ──1 product_embeddings

nail_sizes (0‥9, width_mm per finger)    pricing_settings    site_settings
gift_items (box/card/care/accessory/packaging)  gift_bundles ──< gift_bundle_items
ai_requests (search / stylist / chat / gift / sizing log, converted_order_id)
```

Main tables (see `backend/app/models/`):

- **users**(id, email ⟂, password_hash, full_name, role_id→roles, token_version, is_active, created_at)
- **products**(id, sku ⟂, slug ⟂, name, description, price_paise, compare_at_paise, category_id, style_id, shape_id, finish_id, difficulty, length, is_active, is_featured, created_at, updated_at)
- **product_images**(id, product_id, url, alt, position)
- **colours**(id, name, slug, hex, family, is_active) · **finishes**(…, surcharge_paise) · **nail_shapes**(…, svg_key) · **charms**(id, name, slug, category, asset_key, image_url, price_paise, stock, is_active)
- **inventory**(product_id, size_label, quantity) — ready-made sets per size kit
- **custom_designs**(id, public_id, user_id?, source: chat|draw|stylist, name, shape_id, finish_id, base_colour_id, config JSON, preview_url, price_paise, status: draft|submitted|in_review|approved|rejected, review_notes)
- **custom_design_elements**(design_id, element_type: charm|colour|finish|pattern, element_id, quantity, nail_positions JSON) — the bill of materials
- **orders**(id, number ⟂, user_id?, email, shipping JSON, subtotal/discount/shipping/total_paise, payment_status, payment_method, status, created_at) + **order_status_events** (audit trail for tracking)
- **order_items**(order_id, kind: product|custom|gift_bundle, product_id?, custom_design_id?, gift_bundle_id?, name_snapshot, unit_price_paise, quantity, sizes JSON)
- **order_customizations**(order_item_id, shape, finish, charms JSON, sizes JSON, notes)
- **nail_sizes**(size 0‥9, width_mm, length_mm) · **nail_measurements**(user_id, per-finger mm & sizes, confidence, method)
- **product_embeddings**(product_id ⟂, model, dim, vector JSON, text_hash) — PG `pgvector` can replace JSON later with no API change
- **ai_requests**(id, kind, user_id?, input JSON, output JSON, converted bool)

Money is stored as integer **paise** everywhere (no floats).

---

## 4. API structure (`/api/v1`)

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` |
| Catalogue | `GET /products` (filters, sort, pagination), `GET /products/{slug}`, `GET /catalog/options` (colours, finishes, shapes, charms, styles, occasions …) |
| Smart search | `POST /ai/search` → parsed attributes + ranked matches with % scores |
| Stylist | `POST /ai/stylist` (image upload) → palette, metallics, pattern, style, occasion + matches |
| Chat designer | `POST /ai/design-chat` → next assistant turn + structured draft design |
| Sizing | `POST /ai/sizing` (image + reference object) → per-finger mm, size, confidence |
| Gifting | `POST /ai/gift` → budget-respecting bundle(s) · `GET /gift-bundles` |
| Designs | `POST /designs/quote`, `POST /designs`, `GET/PUT/DELETE /designs/{id}` (owner-only) |
| Checkout | `POST /cart/quote` (server re-pricing), `POST /orders`, `GET /orders/track/{number}?email=` |
| Account | `GET /me/orders`, `GET /me/orders/{number}`, `POST /me/orders/{number}/reorder`, `GET/POST/DELETE /me/favourites`, `GET/POST /me/measurements`, `GET /me/designs` |
| Admin | `/admin/dashboard`, `/admin/analytics`, `/admin/products` (CRUD + images), `/admin/{colours,finishes,shapes,charms,categories,styles,occasions,patterns,tags,gift-items}` (generic CRUD), `/admin/gift-bundles`, `/admin/nail-sizes`, `/admin/inventory`, `/admin/orders` (+ status transitions), `/admin/customers`, `/admin/custom-designs` (review), `/admin/ai-requests`, `/admin/settings` (pricing + site content) |

OpenAPI docs: `http://localhost:8000/docs`.

---

## 5. AI / ML architecture

| Feature | Approach (default, free) | Optional upgrade |
|---|---|---|
| **Attribute extraction** ("baby pink almond chrome with bows") | Vocabulary built **from the live catalogue** (names + synonyms) → longest-match phrase parser, negation handling ("not too flashy"), price regex (`under ₹900`, `budget 1500`). | LLM provider behind `LLMProvider` interface |
| **Semantic search** | Hybrid score = structured attribute match (weighted) + cosine similarity of `HashingVectorizer` (word + char n-grams) embeddings stored in `product_embeddings`. Stateless hashing ⇒ embeddings persist without refitting. | `sentence-transformers` (all-MiniLM-L6-v2, free, CPU) via `EmbeddingProvider`; pgvector index |
| **Chat designer** | Slot-filling dialogue: parser → draft design → availability check against charms/colours/finishes → clarifying questions (accent nails, placement, shape) → structured, priced design. | LLM phrasing layer (still validated against catalogue) |
| **Outfit stylist** | OpenCV: downscale → LAB k-means (k=6) → dominant/secondary colours mapped to nearest catalogue colours (ΔE), metallic detection (specular highlight ratio + low-sat bright pixels), texture/pattern (edge density + colour entropy), rule-based style/occasion. Ranks catalogue by palette distance. | CLIP (open-source) for style tags |
| **Nail sizing** | MediaPipe Hand Landmarker (free model) → fingertip/DIP landmarks; OpenCV Hough/contour detection of reference coin/card → mm-per-pixel; perpendicular skin-profile scan across distal phalanx → finger width → nail width via calibrated ratio → nearest admin-defined size. Confidence from reference fit quality, landmark score, blur, scale sanity. Low confidence ⇒ recommend manual measurement / sizing kit. | Custom nail-segmentation model (U-Net) trained on own data |
| **Gifting** | Interest/colour/style parsing + budget-constrained selection (0/1 knapsack over add-ons, best nail set first). | — |

---

## 6. Free vs paid

**Completely free / open source (everything in this repo):** Next.js, React, Tailwind, FastAPI, SQLAlchemy, Alembic, PostgreSQL, OpenCV, MediaPipe, NumPy, scikit-learn, Pillow, local file storage, COD / manual UPI payment flow.

**May eventually need paid infrastructure:**
- Hosting — free tiers exist (Vercel hobby for frontend, Render/Fly/Railway free-ish for API, Neon/Supabase free Postgres), but a real business will want a paid tier for uptime.
- Object storage/CDN for images — Cloudflare R2 has a generous free tier; plug in via `storage/` adapter.
- Payment gateway — Razorpay/Cashfree charge per transaction (no monthly fee). Plug in via `services/payments.py` provider interface.
- Transactional email — Resend/Brevo free tiers; plug in via notifications interface.
- LLM API — optional only; never required.
