"""Integration tests through the HTTP API (SQLite, seeded demo catalogue)."""

import io

from PIL import Image
from sqlalchemy import select

from app.models import Charm, Inventory, Product
from tests.conftest import SHIPPING

API = "/api/v1"


def _png_bytes(colour=(248, 200, 216), size=(64, 64)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", size, colour).save(buf, "PNG")
    return buf.getvalue()


def _product(db, slug="pink-bow-coquette") -> Product:
    return db.scalar(select(Product).where(Product.slug == slug))


def _in_stock_label(product: Product) -> str:
    return next(inv.size_label for inv in product.inventory if inv.quantity > 0)


# ------------------------------------------------------------------ auth & RBAC


def test_register_login_me_logout(client):
    r = client.post(f"{API}/auth/register", json={"email": "Ana@Example.com", "password": "short1",
                                                   "full_name": "Ana"})
    assert r.status_code == 422  # too short
    r = client.post(f"{API}/auth/register", json={"email": "Ana@Example.com", "password": "passwordonly",
                                                   "full_name": "Ana"})
    assert r.status_code == 422 and "mix" in r.json()["detail"]
    r = client.post(f"{API}/auth/register", json={"email": "Ana@Example.com", "password": "Pretty!nails9",
                                                   "full_name": "Ana"})
    assert r.status_code == 201
    assert "nifty_session" in r.cookies
    assert r.json()["user"]["email"] == "ana@example.com"
    assert client.get(f"{API}/auth/me").json()["role_name"] == "customer"
    dup = client.post(f"{API}/auth/register", json={"email": "ana@example.com", "password": "Pretty!nails9",
                                                     "full_name": "Ana"})
    assert dup.status_code == 409
    client.post(f"{API}/auth/logout")
    client.cookies.clear()
    assert client.get(f"{API}/auth/me").status_code == 401
    bad = client.post(f"{API}/auth/login", json={"email": "ana@example.com", "password": "wrong-pass1"})
    assert bad.status_code == 401


def test_password_is_hashed(client, db):
    client.post(f"{API}/auth/register", json={"email": "h@x.in", "password": "Secret!123", "full_name": "H"})
    from app.models import User

    user = db.scalar(select(User).where(User.email == "h@x.in"))
    assert user.password_hash != "Secret!123" and user.password_hash.startswith("$2")


def test_admin_routes_require_admin(client, customer_client):
    assert customer_client.get(f"{API}/admin/dashboard").status_code == 403
    assert customer_client.post(f"{API}/admin/colours", json={}).status_code in (403, 422)
    customer_client.cookies.clear()
    assert client.get(f"{API}/admin/dashboard").status_code == 401
    assert client.get(f"{API}/admin/products").status_code == 401


def test_every_admin_route_is_protected(client):
    """Guard against a new admin endpoint shipping without RBAC."""
    paths = client.get("/openapi.json").json()["paths"]
    admin_paths = [p for p in paths if p.startswith(f"{API}/admin")]
    assert len(admin_paths) > 30
    for path in admin_paths:
        for method in paths[path]:
            url = path.replace("{item_id}", "1").replace("{product_id}", "1").replace("{number}", "X") \
                .replace("{public_id}", "x").replace("{user_id}", "1").replace("{request_id}", "1") \
                .replace("{review_id}", "1").replace("{bundle_id}", "1").replace("{image_id}", "1") \
                .replace("{folder}", "charms").replace("{key}", "site")
            r = client.request(method.upper(), url)
            assert r.status_code == 401, f"{method.upper()} {path} → {r.status_code}"


def test_logout_all_revokes_tokens(customer_client):
    token = customer_client.cookies.get("nifty_session")
    assert customer_client.post(f"{API}/auth/logout-all").status_code == 200
    customer_client.cookies.clear()
    r = customer_client.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 401


def test_login_rate_limited(client):
    codes = [client.post(f"{API}/auth/login", json={"email": "x@y.in", "password": "nope"}).status_code
             for _ in range(12)]
    assert 429 in codes


# ------------------------------------------------------------------ catalogue


def test_product_listing_filters_and_detail(client):
    r = client.get(f"{API}/products", params={"colour": "baby-pink", "finish": "chrome", "page_size": 48})
    names = [p["name"] for p in r.json()["items"]]
    assert "Pink Bow Coquette" in names
    assert all(p["finish"]["slug"] == "chrome" for p in r.json()["items"])

    r = client.get(f"{API}/products", params={"max_price": 70000, "sort": "price_asc"})
    prices = [p["price_paise"] for p in r.json()["items"]]
    assert prices == sorted(prices) and max(prices) <= 70000

    detail = client.get(f"{API}/products/pink-bow-coquette").json()
    assert detail["shape"]["svg_key"] == "almond"
    assert {c["slug"] for c in detail["charms"]} == {"white-bow", "pearl"}
    assert detail["art"]["base"] == "#F8C8D8"
    assert client.get(f"{API}/products/does-not-exist").status_code == 404


def test_catalog_options(client):
    data = client.get(f"{API}/catalog/options").json()
    assert len(data["nail_sizes"]) == 10
    assert any(c["slug"] == "pearl" for c in data["charms"])
    assert data["price_range"][0] > 0


# ------------------------------------------------------------------ AI features


def test_smart_search_spec_example(client):
    r = client.post(f"{API}/ai/search", json={"query": "I want baby pink almond nails with chrome, little bows "
                                                        "and pearls. Something cute but not too flashy."})
    body = r.json()
    top = body["matches"][0]
    assert top["product"]["slug"] == "pink-bow-coquette"
    assert top["match_percent"] >= 85
    assert all(m["match_percent"] <= top["match_percent"] for m in body["matches"])
    assert "Chrome" in body["attributes"]["chips"]


def test_search_never_invents_products(client, db):
    real = {p.id for p in db.scalars(select(Product))}
    body = client.post(f"{API}/ai/search", json={"query": "purple dragon scales with unicorn horns"}).json()
    assert {m["product"]["id"] for m in body["matches"]} <= real


def test_search_flags_unavailable(client):
    body = client.post(f"{API}/ai/search", json={"query": "nails with cherries and seashells"}).json()
    messages = " ".join(u["message"] for u in body["unavailable"])
    assert "cherry" in messages and "Seashell" in messages


def test_design_chat_round_trip(client):
    r = client.post(f"{API}/ai/design-chat", json={
        "message": "I want pink chrome nails with tiny white bows, pearls and 3D strawberries."}).json()
    assert "Would you like the" in r["reply"]
    assert r["quick_replies"][:3] == ["One accent nail", "Two accent nails", "Every nail"]
    state = r["state"]
    for msg in ["Two accent nails", "Every nail", "One accent nail", "Almond", "Medium"]:
        r = client.post(f"{API}/ai/design-chat", json={"message": msg, "state": state}).json()
        state = r["state"]
    assert r["complete"] is True
    assert r["quote"]["manufacturable"] is True
    charms = {b["slug"]: b["quantity"] for b in r["quote"]["bill_of_materials"] if b["element_type"] == "charm"}
    assert charms == {"white-bow": 4, "pearl": 30, "3d-strawberry": 2}


def test_design_chat_rejects_tampered_state(client):
    r = client.post(f"{API}/ai/design-chat", json={"message": "almond", "state": {
        "base_colour": "unicorn-glitter", "charms": [{"slug": "diamond-tiara", "placement": "every"}]}}).json()
    assert r["state"]["base_colour"] is None
    assert r["state"]["charms"] == []


def test_gift_finder_respects_budget(client):
    body = client.post(f"{API}/ai/gift", json={
        "description": "My best friend is 22. She loves pink, Barbie, makeup and cute things.",
        "occasion": "Birthday", "budget_rupees": 1500}).json()
    assert body["options"]
    for option in body["options"]:
        assert option["total_paise"] <= 150000
        assert sum(line["price_paise"] for line in option["lines"]) == option["total_paise"] or option["bundle_id"]
        assert option["lines"][0]["item_type"] == "nail_set"


def test_gift_finder_tiny_budget(client):
    body = client.post(f"{API}/ai/gift", json={"description": "anything", "budget_rupees": 100}).json()
    assert body["options"] == [] and "start at" in body["message"]


def test_stylist_endpoint(client):
    body = client.post(f"{API}/ai/stylist", files={"image": ("outfit.png", _png_bytes(), "image/png")},
                       data={"note": "for a brunch"}).json()
    assert body["palette"] and body["summary"].startswith("Your outfit has")
    assert body["matches"]


def test_upload_validation_rejects_non_images(client):
    r = client.post(f"{API}/ai/stylist", files={"image": ("evil.png", b"<?php echo 1; ?>", "image/png")})
    assert r.status_code == 422
    big = b"\x89PNG" + b"0" * (9 * 1024 * 1024)
    r = client.post(f"{API}/ai/stylist", files={"image": ("big.png", big, "image/png")})
    assert r.status_code == 422


def test_sizing_references(client):
    refs = client.get(f"{API}/ai/sizing/references").json()
    assert {"coin_10", "card"} <= {r["key"] for r in refs}


# ------------------------------------------------------------------ designs, cart, checkout


def _custom_config(charm="pearl"):
    return {"shape": "almond", "length": "medium", "base_colour": "baby-pink", "finish": "chrome",
            "nails": {"L4": {"charms": [{"charm": charm, "x": 0.5, "y": 0.6}]},
                      "R4": {"charms": [{"charm": charm, "x": 0.5, "y": 0.6}], "pattern": "french-tip"}}}


def test_design_quote_and_unavailable_elements(client):
    q = client.post(f"{API}/designs/quote", json=_custom_config()).json()
    assert q["manufacturable"] and q["price_paise"] > 79900
    assert {"element_type": "charm", "slug": "pearl", "quantity": 2} .items() <= q["bill_of_materials"][0].items()
    bad = client.post(f"{API}/designs/quote", json=_custom_config(charm="seashell")).json()
    assert not bad["manufacturable"]
    unknown = client.post(f"{API}/designs/quote", json=_custom_config(charm="unicorn")).json()
    assert not unknown["manufacturable"]


def test_design_privacy_between_customers(client):
    client.post(f"{API}/auth/register", json={"email": "a@x.in", "password": "Aaaaaa!1", "full_name": "A"})
    design = client.post(f"{API}/designs", json={"name": "Mine", "source": "draw",
                                                 "config": _custom_config()}).json()
    assert client.get(f"{API}/designs/{design['public_id']}").status_code == 200
    client.cookies.clear()
    client.post(f"{API}/auth/register", json={"email": "b@x.in", "password": "Bbbbbb!1", "full_name": "B"})
    assert client.get(f"{API}/designs/{design['public_id']}").status_code == 404
    assert client.delete(f"{API}/designs/{design['public_id']}").status_code == 404
    assert client.get(f"{API}/me/designs").json() == []


def test_paint_layer_is_stored_and_validated(client, media_dir):
    import base64

    config = _custom_config()
    config["nails"]["L1"] = {"paint": "data:image/png;base64," + base64.b64encode(_png_bytes()).decode()}
    design = client.post(f"{API}/designs", json={"source": "draw", "config": config}).json()
    paint_url = design["config"]["nails"]["L1"]["paint"]
    assert paint_url.startswith("/media/paint/")
    assert (media_dir / paint_url.removeprefix("/media/")).exists()
    config["nails"]["L1"] = {"paint": "https://evil.example/tracker.png"}
    design = client.post(f"{API}/designs", json={"source": "draw", "config": config}).json()
    assert design["config"]["nails"]["L1"]["paint"] is None


def test_checkout_product_decrements_stock(client, db):
    p = _product(db)
    label = _in_stock_label(p)
    before = p.stock_for(label)
    line = {"kind": "product", "product_id": p.id, "quantity": 1, "size": {"label": label}}
    quote = client.post(f"{API}/cart/quote", json={"lines": [line]}).json()
    assert quote["valid"] and quote["subtotal_paise"] == p.price_paise
    r = client.post(f"{API}/orders", json={"lines": [line], "email": "guest@example.com", "shipping": SHIPPING,
                                           "payment_method": "cod"})
    assert r.status_code == 201, r.text
    order = r.json()["order"]
    assert order["status"] == "NEW" and order["total_paise"] == quote["total_paise"]
    db.expire_all()
    inv = db.scalar(select(Inventory).where(Inventory.product_id == p.id, Inventory.size_label == label))
    assert inv.quantity == before - 1
    tracked = client.get(f"{API}/orders/track", params={"number": order["number"], "email": "GUEST@example.com"})
    assert tracked.status_code == 200
    wrong = client.get(f"{API}/orders/track", params={"number": order["number"], "email": "other@example.com"})
    assert wrong.status_code == 404


def test_checkout_rejects_overselling(client, db):
    p = _product(db)
    label = _in_stock_label(p)
    stock = p.stock_for(label)
    line = {"kind": "product", "product_id": p.id, "quantity": min(stock + 1, 10), "size": {"label": label}}
    if stock + 1 > 10:
        return
    r = client.post(f"{API}/orders", json={"lines": [line], "email": "g@e.com", "shipping": SHIPPING,
                                           "payment_method": "cod"})
    assert r.status_code == 409


def test_client_cannot_set_prices(client, db):
    p = _product(db)
    line = {"kind": "product", "product_id": p.id, "quantity": 1, "size": {"label": "CUSTOM",
            "fingers": {"thumb": 2, "index": 5, "middle": 4, "ring": 5, "pinky": 8}},
            "unit_price_paise": 1, "price_paise": 1}
    quote = client.post(f"{API}/cart/quote", json={"lines": [line]}).json()
    assert quote["lines"][0]["unit_price_paise"] == p.price_paise


def test_custom_order_goes_to_design_review_and_uses_charms(customer_client, db):
    design = customer_client.post(f"{API}/designs", json={"name": "Pearls", "source": "chat",
                                                          "config": _custom_config()}).json()
    pearl_before = db.scalar(select(Charm).where(Charm.slug == "pearl")).stock
    line = {"kind": "custom", "design_public_id": design["public_id"], "quantity": 2,
            "size": {"label": "CUSTOM", "fingers": {"thumb": 2, "index": 5, "middle": 4, "ring": 5, "pinky": 8}}}
    r = customer_client.post(f"{API}/orders", json={"lines": [line], "email": "priya@example.com",
                                                    "shipping": SHIPPING, "payment_method": "upi_manual"})
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["order"]["status"] == "DESIGN_REVIEW"
    assert "UPI" in body["payment_instructions"]
    item = body["order"]["items"][0]
    assert item["customization"]["charms"] == [{"type": "pearl", "quantity": 2, "nails": ["L4", "R4"]}]
    db.expire_all()
    assert db.scalar(select(Charm).where(Charm.slug == "pearl")).stock == pearl_before - 4
    orders = customer_client.get(f"{API}/me/orders").json()
    assert orders[0]["has_custom"] is True
    reorder = customer_client.post(f"{API}/me/orders/{orders[0]['number']}/reorder").json()
    assert reorder["lines"][0]["design_public_id"] == design["public_id"]


def test_customers_cannot_see_each_others_orders(client, db):
    client.post(f"{API}/auth/register", json={"email": "one@x.in", "password": "Oneone!1", "full_name": "One"})
    p = _product(db, "clean-girl-french")
    line = {"kind": "product", "product_id": p.id, "quantity": 1, "size": {"label": "CUSTOM",
            "fingers": {"thumb": 2, "index": 5, "middle": 4, "ring": 5, "pinky": 8}}}
    number = client.post(f"{API}/orders", json={"lines": [line], "email": "one@x.in", "shipping": SHIPPING,
                                                "payment_method": "cod"}).json()["order"]["number"]
    client.cookies.clear()
    client.post(f"{API}/auth/register", json={"email": "two@x.in", "password": "Twotwo!1", "full_name": "Two"})
    assert client.get(f"{API}/me/orders/{number}").status_code == 404
    assert client.get(f"{API}/me/orders").json() == []


def test_invalid_shipping_is_rejected(client, db):
    p = _product(db)
    line = {"kind": "product", "product_id": p.id, "size": {"label": _in_stock_label(p)}}
    r = client.post(f"{API}/orders", json={"lines": [line], "email": "g@e.com",
                                           "shipping": {**SHIPPING, "pincode": "12345"}, "payment_method": "cod"})
    assert r.status_code == 422 and "PIN" in r.json()["detail"]


# ------------------------------------------------------------------ admin


def test_admin_order_lifecycle_and_cancel_restocks(admin_client, db):
    p = _product(db)
    label = _in_stock_label(p)
    before = p.stock_for(label)
    line = {"kind": "product", "product_id": p.id, "quantity": 1, "size": {"label": label}}
    number = admin_client.post(f"{API}/orders", json={"lines": [line], "email": "g@e.com", "shipping": SHIPPING,
                                                      "payment_method": "cod"}).json()["order"]["number"]
    bad = admin_client.post(f"{API}/admin/orders/{number}/status", json={"status": "SHIPPED"})
    assert bad.status_code == 400
    ok = admin_client.post(f"{API}/admin/orders/{number}/status", json={"status": "APPROVED"})
    assert ok.json()["status"] == "APPROVED"
    cancel = admin_client.post(f"{API}/admin/orders/{number}/status", json={"status": "CANCELLED"})
    assert cancel.json()["status"] == "CANCELLED"
    db.expire_all()
    inv = db.scalar(select(Inventory).where(Inventory.product_id == p.id, Inventory.size_label == label))
    assert inv.quantity == before
    dash = admin_client.get(f"{API}/admin/dashboard").json()
    assert dash["status_breakdown"]["CANCELLED"] == 1 and dash["orders"] == 0


def test_admin_product_crud(admin_client, db):
    opts = admin_client.get(f"{API}/catalog/options").json()
    colour = next(c["id"] for c in opts["colours"] if c["slug"] == "lavender")
    charm = next(c["id"] for c in opts["charms"] if c["slug"] == "butterfly")
    payload = {"sku": "NN-900", "slug": "lilac-dream", "name": "Lilac Dream", "price_paise": 79900,
               "shape_id": opts["shapes"][0]["id"], "finish_id": opts["finishes"][0]["id"],
               "colours": [{"colour_id": colour, "role": "base"}], "charms": [{"charm_id": charm, "quantity": 2}],
               "inventory": [{"size_label": "M", "quantity": 5}]}
    r = admin_client.post(f"{API}/admin/products", json=payload)
    assert r.status_code == 201, r.text
    pid = r.json()["id"]
    assert admin_client.post(f"{API}/admin/products", json=payload).status_code == 409  # duplicate SKU/slug
    img = admin_client.post(f"{API}/admin/products/{pid}/images",
                            files=[("files", ("a.png", _png_bytes(), "image/png"))])
    assert img.status_code == 201 and img.json()[0]["url"].endswith(".webp")
    found = admin_client.post(f"{API}/ai/search", json={"query": "lavender butterflies"}).json()
    assert any(m["product"]["slug"] == "lilac-dream" for m in found["matches"])  # embeddings refreshed
    payload["price_paise"] = 89900
    assert admin_client.put(f"{API}/admin/products/{pid}", json=payload).json()["price_paise"] == 89900
    assert admin_client.delete(f"{API}/admin/products/{pid}").status_code == 200
    assert admin_client.get(f"{API}/products/lilac-dream").status_code == 404


def test_admin_lookup_in_use_cannot_be_deleted(admin_client):
    colours = admin_client.get(f"{API}/admin/colours").json()
    baby_pink = next(c for c in colours if c["slug"] == "baby-pink")
    r = admin_client.delete(f"{API}/admin/colours/{baby_pink['id']}")
    assert r.status_code == 409 and "Deactivate" in r.json()["detail"]
    new = admin_client.post(f"{API}/admin/colours", json={"name": "Teal", "slug": "teal", "hex": "#1e8c8c"}).json()
    assert new["hex"] == "#1E8C8C"
    bad = admin_client.post(f"{API}/admin/colours", json={"name": "X", "slug": "Not A Slug", "hex": "red"})
    assert bad.status_code == 422
    assert admin_client.delete(f"{API}/admin/colours/{new['id']}").status_code == 200


def test_admin_nail_sizes_validation(admin_client):
    rows = [{"size": s, "width_mm": 18 - s} for s in range(10)]
    assert admin_client.put(f"{API}/admin/nail-sizes", json=rows).status_code == 200
    rows[3]["width_mm"] = 30 - 1
    assert admin_client.put(f"{API}/admin/nail-sizes", json=rows).status_code == 422


def test_staff_cannot_change_pricing(client, db):
    from app.core.security import hash_password
    from app.models import Role, User

    staff = db.scalar(select(Role).where(Role.name == "staff"))
    db.add(User(email="staff@x.in", password_hash=hash_password("Staff!123"), full_name="S", role_id=staff.id))
    db.commit()
    client.post(f"{API}/auth/login", json={"email": "staff@x.in", "password": "Staff!123"})
    assert client.get(f"{API}/admin/dashboard").status_code == 200
    assert client.put(f"{API}/admin/settings/pricing", json={"custom_base_paise": 1}).status_code == 403


def test_admin_settings_validation(admin_client):
    # The pricing endpoint is a full structural PUT (tiers/weights can't be safely partial-merged).
    pricing = admin_client.get(f"{API}/admin/settings").json()["pricing"]
    r = admin_client.put(f"{API}/admin/settings/pricing", json={**pricing, "custom_base_paise": 89900})
    assert r.json()["custom_base_paise"] == 89900
    assert admin_client.put(f"{API}/admin/settings/pricing", json={"nope": 1}).status_code == 422
    assert admin_client.put(f"{API}/admin/settings/pricing", json={**pricing, "custom_base_paise": -5}).status_code == 422
    bad_tiers = {**pricing, "tiers": [{"name": "Only", "min": 1, "max": 5, "price_paise": 1000}]}
    assert admin_client.put(f"{API}/admin/settings/pricing", json=bad_tiers).status_code == 422
