# Nifty Nails

Premium handmade press-on nails, and the platform behind them: storefront, AI nail stylist, custom design studio,
computer-vision sizing, gifting, orders, and a full admin app.

Everything runs **free and locally**. There's no paid AI API, and every AI feature is built on open-source models and
deterministic algorithms. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the system design, database schema, API
map and AI/ML design.

| Part | Stack |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| Backend | Python 3.12, FastAPI, Pydantic 2, SQLAlchemy 2, Alembic |
| Database | PostgreSQL 16 (Docker) |
| AI / CV | OpenCV, MediaPipe (hand landmarks, in-browser + server), NumPy, scikit-learn |

---

## Run it locally

Prerequisites: Docker Desktop, Python 3.12, Node 20+.

```bash
# 1. Database
docker compose up -d

# 2. Backend  (http://localhost:8000, API docs at /docs)
cd backend
python -m venv .venv
.venv\Scripts\activate            # macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
copy .env.example .env            # then set SECRET_KEY and ADMIN_PASSWORD (required)
python scripts/download_models.py # MediaPipe hand model (free, ~8 MB)
alembic upgrade head
python -m app.seed --demo         # admin user + demo catalogue
uvicorn app.main:app --port 8000

# 3. Frontend  (http://localhost:3100)
cd frontend
npm install                       # also copies MediaPipe assets into public/
npm run dev
```

- Storefront: <http://localhost:3100>
- Admin: <http://localhost:3100/admin>. Sign in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` you set in `backend/.env`
  (the seed command creates this account; production refuses to start with a default password).

The frontend proxies `/api/*` and `/media/*` to the API, so the session cookie is first-party. Set `API_URL` if the API
isn't on `localhost:8000`.

## Tests & quality checks

```bash
cd backend && pytest                  # 54 unit + integration tests (SQLite in-memory)
cd backend && ruff check app tests
cd frontend && npx tsc --noEmit && npx eslint src
cd frontend && npm run build
cd frontend && node scripts/e2e-checkout.mjs 390    # browser journeys (needs both servers running)
cd frontend && node scripts/e2e-studio.mjs 390
cd frontend && node scripts/shot.mjs shop --w=360,390,414,768,1280   # screenshots for visual QA
```

## What's included

**Storefront (mobile-first):** homepage, catalogue with filters, product pages with size-kit stock, AI Nail Stylist
(describe it / match an outfit photo), Create Your Own (chat designer + drawing studio), Find My Size (photo + coin),
Gift Nifty, bag, checkout (UPI / COD), order confirmation and tracking, and accounts with orders, reorder, saved designs,
favourites and sizes.

**Admin (`/admin`):** dashboard and analytics (sales, AOV, popular designs/charms/colours, AI→purchase conversion),
orders with status workflow and printable production sheets, custom-design review queue, products (with image upload and
live artwork preview), inventory, charms, colours, finishes, shapes, patterns, categories/styles/occasions/tags,
customers and roles, AI request log, reviews moderation, gifting (add-ons and bundles), nail size table, and settings
(pricing, storefront copy, sizing calibration).

**Business rules enforced on the server:**
- The catalogue is the source of truth. AI features only recommend real products and in-stock elements, and anything
  unavailable is reported with the closest alternative.
- The server calculates every price. Custom designs are priced from admin settings, and cart lines are re-priced at
  checkout.
- Custom designs are stored as full configs plus a normalised bill of materials (charm × quantity × nail).
- Stock is decremented atomically at checkout, so it can't be oversold, and restocked on cancellation.
- RBAC: every `/api/v1/admin/*` route requires staff/admin, and owner-only actions (pricing, roles) require admin. A test
  asserts no admin route is reachable without auth.

## Your own designs & photos

Add products in **Admin → Products**. Until you upload photos, the store renders polished nail artwork from each
product's shape, colours, finish, pattern and charms. Upload photos and the first one becomes the cover.

## Free vs. paid

Everything in this repo is free/open-source. Paid services you may eventually want (all optional, behind clean
interfaces): hosting beyond free tiers, image CDN/object storage (the `storage/` adapter), a payment gateway such as
Razorpay (the payment method is recorded per order; add a provider), transactional email, and an LLM (never required).
Details are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#6-free-vs-paid).

## Honest limits

- **Photo sizing is an estimate.** It measures finger width at the nail bed and converts it with a per-finger ratio you
  can calibrate in Settings. It works best with a flat hand on a plain surface and a coin beside it. When confidence is
  low, the UI tells the customer to measure by hand or use a sizing kit instead of pretending. Tune the ratios with real
  measurements from your first customers.
- **The outfit stylist** uses classical colour/texture analysis (palette, metallic sparkle, print density). It's
  reliable for colours and metallics; "style" and "occasion" are rule-based inferences.
