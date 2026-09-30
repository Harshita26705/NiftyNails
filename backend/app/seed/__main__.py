"""Seed the database:  python -m app.seed [--demo]

Always ensures roles, the bootstrap admin, nail sizes and size kits exist.
--demo loads the demo catalogue (only when the catalogue is empty).
"""

import argparse
import logging
import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.logging import configure_logging
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import (
    Category,
    Charm,
    Colour,
    Finish,
    GiftBundle,
    GiftBundleItem,
    GiftItem,
    Inventory,
    NailShape,
    NailSize,
    Occasion,
    Pattern,
    Product,
    ProductCharm,
    ProductColour,
    Review,
    Role,
    SizeKit,
    Style,
    Tag,
    User,
)
from app.models.enums import RoleName
from app.seed import data
from app.services.matching import ensure_embeddings

log = logging.getLogger("seed")


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower().replace("&", "and")).strip("-")


def ensure_foundation(db: Session) -> None:
    for name, desc in ((RoleName.CUSTOMER, "Shopper"), (RoleName.STAFF, "Operations staff"),
                       (RoleName.ADMIN, "Owner / full access")):
        if not db.scalar(select(Role).where(Role.name == name)):
            db.add(Role(name=name, description=desc))
    db.flush()

    settings = get_settings()
    if not db.scalar(select(User).where(User.email == settings.admin_email.lower())):
        admin_role = db.scalar(select(Role).where(Role.name == RoleName.ADMIN))
        db.add(User(email=settings.admin_email.lower(), password_hash=hash_password(settings.admin_password),
                    full_name="Nifty Admin", role_id=admin_role.id))
        log.info("Created admin user %s", settings.admin_email)

    if not db.scalar(select(NailSize.size).limit(1)):
        db.add_all(NailSize(size=s, width_mm=w, length_mm=length) for s, w, length in data.NAIL_SIZES)
    if not db.scalar(select(SizeKit.label).limit(1)):
        db.add_all(SizeKit(label=label, fingers=f, sort_order=i) for i, (label, f) in enumerate(data.SIZE_KITS))
    db.commit()


DEMO_ACCOUNTS = (
    # ".local" is a reserved/special-use TLD (RFC 6761) that the API's own email validator rejects at login,
    # so these use the brand's real-looking domain with a "demo" local-part instead of a ".local" one.
    ("customer.demo@niftynails.in", "NiftyCustomer123!", RoleName.CUSTOMER, "Nifty Demo Customer"),
    ("admin.demo@niftynails.in", "NiftyAdmin123!", RoleName.ADMIN, "Nifty Demo Admin"),
)


def load_demo_accounts(db: Session) -> None:
    """Deterministic demo accounts for local/staging walkthroughs — never created in production."""
    if get_settings().is_production:
        log.warning("Refusing to create demo accounts: ENVIRONMENT=production")
        return
    roles = {r.name: r for r in db.scalars(select(Role))}
    for email, password, role_name, full_name in DEMO_ACCOUNTS:
        if db.scalar(select(User).where(User.email == email)):
            continue
        db.add(User(email=email, password_hash=hash_password(password), full_name=full_name, role_id=roles[role_name].id))
        log.info("Created demo account %s (%s)", email, role_name)
    db.commit()


def load_demo(db: Session) -> None:
    if db.scalar(select(Product.id).limit(1)):
        log.info("Catalogue already has products — skipping demo data")
        return

    def lookups(model, rows, **extra_fn):
        out = {}
        for i, row in enumerate(rows):
            obj = model(name=row[0], slug=slugify(row[0]), sort_order=i, **{k: fn(row) for k, fn in extra_fn.items()})
            db.add(obj)
            out[row[0]] = obj
        return out

    colours = lookups(Colour, data.COLOURS, hex=lambda r: r[1], family=lambda r: r[2], synonyms=lambda r: r[3])
    finishes = lookups(Finish, data.FINISHES, surcharge_paise=lambda r: r[1] * 100, flashiness=lambda r: r[2],
                       synonyms=lambda r: r[3])
    shapes = lookups(NailShape, data.SHAPES, svg_key=lambda r: r[1], surcharge_paise=lambda r: r[2] * 100,
                     synonyms=lambda r: r[3])
    patterns = lookups(Pattern, data.PATTERNS, surcharge_paise=lambda r: r[1] * 100, synonyms=lambda r: r[2])
    categories = lookups(Category, data.CATEGORIES, synonyms=lambda r: r[1])
    styles = lookups(Style, data.STYLES, synonyms=lambda r: r[1])
    occasions = lookups(Occasion, data.OCCASIONS, synonyms=lambda r: r[1])
    tags = lookups(Tag, [(t,) for t in data.TAGS])
    charms = lookups(Charm, data.CHARMS, category=lambda r: r[1], asset_key=lambda r: r[2],
                     price_paise=lambda r: r[3] * 100, stock=lambda r: r[4], is_3d=lambda r: r[5],
                     flashiness=lambda r: r[6], synonyms=lambda r: r[7])
    db.flush()

    products: dict[str, Product] = {}
    for i, row in enumerate(data.PRODUCTS):
        (name, price, category, style, shape, length, finish, colour_roles, charm_qty, pattern_names,
         occasion_names, tag_names, difficulty, featured, tagline, art) = row
        p = Product(
            sku=f"NN-{i + 101:03d}", slug=slugify(name), name=name, tagline=tagline, price_paise=price * 100,
            compare_at_paise=(price + 200) * 100 if "Limited Edition" in tag_names else None,
            description=(
                f"{tagline} Each {name} set is handmade to order by our nail artists using salon-grade gel, "
                "cured for a glossy, chip-resistant finish. Includes 24 nails across sizes, adhesive tabs, "
                "nail glue, a mini file, cuticle stick and prep pad. Reusable with care."
            ),
            category=categories[category], style=styles[style], shape=shapes[shape], length=length,
            finish=finishes[finish], difficulty=difficulty, is_featured=featured, art=art,
            popularity=max(0, 60 - i * 2),
        )
        p.colours = [ProductColour(colour=colours[c], role=role, position=j) for j, (c, role) in enumerate(colour_roles)]
        p.charms = [ProductCharm(charm=charms[c], quantity=q) for c, q in charm_qty]
        p.patterns = [patterns[n] for n in pattern_names]
        p.occasions = [occasions[n] for n in occasion_names]
        p.tags = [tags[n] for n in tag_names]
        # Deterministic demo stock with a few sold-out sizes.
        p.inventory = [Inventory(size_label=label, quantity=0 if (i + k) % 7 == 0 else 4 + (i * 3 + k * 5) % 17)
                       for k, label in enumerate(("XS", "S", "M", "L"))]
        db.add(p)
        products[name] = p
    db.flush()

    items = {}
    for slug, name, item_type, price, stock, item_tags, personalisable, desc in data.GIFT_ITEMS:
        items[slug] = GiftItem(slug=slug, name=name, item_type=item_type, price_paise=price * 100, stock=stock,
                               tags=item_tags, is_personalisable=personalisable, description=desc)
        db.add(items[slug])
    db.flush()
    bundle = GiftBundle(slug="birthday-bestie-box", name="Birthday Bestie Box",
                        description="Pink Bow Coquette, signature box, birthday card and a bow scrunchie.",
                        product=products["Pink Bow Coquette"], bundle_price_paise=129900,
                        tags=["birthday", "bestie", "friend", "pink", "coquette", "bows"])
    bundle.items = [GiftBundleItem(item=items["signature-gift-box"]), GiftBundleItem(item=items["birthday-confetti-card"]),
                    GiftBundleItem(item=items["satin-bow-scrunchie"])]
    db.add(bundle)

    for author, rating, title, body, product_name in data.REVIEWS:
        db.add(Review(author_name=author, rating=rating, title=title, body=body, is_published=True, is_featured=True,
                      product=products.get(product_name) if product_name else None))
    db.commit()
    ensure_embeddings(db, list(products.values()))
    log.info("Loaded demo catalogue: %d products, %d charms", len(products), len(charms))


def main() -> None:
    configure_logging()
    parser = argparse.ArgumentParser(description="Seed Nifty Nails data")
    parser.add_argument("--demo", action="store_true", help="load the demo catalogue")
    args = parser.parse_args()
    with SessionLocal() as db:
        ensure_foundation(db)
        if args.demo:
            load_demo(db)
            load_demo_accounts(db)


if __name__ == "__main__":
    main()
