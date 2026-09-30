"""Cart pricing, checkout and order lifecycle. Prices are always computed here, never trusted from clients."""

import secrets
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models import (
    AIRequest,
    Charm,
    CustomDesign,
    GiftBundle,
    GiftItem,
    Inventory,
    Order,
    OrderCustomization,
    OrderItem,
    OrderStatusEvent,
    Product,
    User,
)
from app.models.enums import OrderStatus
from app.schemas.design import DesignConfig
from app.schemas.order import CartLineIn, CartQuoteOut, CheckoutIn, QuotedLine
from app.services.catalog import product_art
from app.services.designs import analyse_design, production_charms
from app.services.settings import get_setting

ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    OrderStatus.NEW: {OrderStatus.DESIGN_REVIEW, OrderStatus.APPROVED, OrderStatus.CANCELLED},
    OrderStatus.DESIGN_REVIEW: {OrderStatus.APPROVED, OrderStatus.CANCELLED},
    OrderStatus.APPROVED: {OrderStatus.IN_PRODUCTION, OrderStatus.CANCELLED},
    OrderStatus.IN_PRODUCTION: {OrderStatus.READY, OrderStatus.CANCELLED},
    OrderStatus.READY: {OrderStatus.SHIPPED, OrderStatus.CANCELLED},
    OrderStatus.SHIPPED: {OrderStatus.DELIVERED},
    OrderStatus.DELIVERED: set(),
    OrderStatus.CANCELLED: set(),
}
STATUS_NOTES = {
    OrderStatus.NEW: "Order placed — thank you! 💗",
    OrderStatus.DESIGN_REVIEW: "Our nail artist is reviewing your custom design.",
    OrderStatus.APPROVED: "Design approved and queued for production.",
    OrderStatus.IN_PRODUCTION: "Your nails are being handmade.",
    OrderStatus.READY: "Packed and ready to ship.",
    OrderStatus.SHIPPED: "On its way to you!",
    OrderStatus.DELIVERED: "Delivered. Enjoy your new nails!",
    OrderStatus.CANCELLED: "Order cancelled.",
}


def _design_for(db: Session, public_id: str, user: User | None) -> CustomDesign | None:
    design = db.scalar(select(CustomDesign).where(CustomDesign.public_id == public_id))
    if design is None:
        return None
    # A design owned by an account is private to that account.
    if design.user_id is not None and (user is None or (design.user_id != user.id and user.role_name == "customer")):
        return None
    return design


def quote_cart(db: Session, lines: list[CartLineIn], user: User | None) -> CartQuoteOut:
    pricing = get_setting(db, "pricing")
    quoted: list[QuotedLine] = []
    # Stock is shared across lines (two lines of the same kit/charm must fit together).
    kit_demand: dict[tuple[int, str], int] = {}
    charm_demand: dict[str, int] = {}
    item_demand: dict[int, int] = {}

    for index, line in enumerate(lines):
        issues: list[str] = []
        name, image, art, config, unit, lead = "Unavailable item", None, None, None, 0, pricing["ready_lead_days"]

        if line.kind == "product":
            p = db.get(Product, line.product_id)
            if p is None or not p.is_active:
                issues.append("This design is no longer available.")
            else:
                name, image, art = p.name, (p.images[0].url if p.images else None), product_art(p)
                unit = p.price_paise
                label = line.size.label if line.size else None
                if label not in p.available_sizes:
                    issues.append(f"Size {label} isn't offered for this design.")
                elif label == "CUSTOM":
                    unit += pricing["custom_fit_surcharge_paise"]
                    lead = pricing["custom_lead_days"]
                else:
                    key = (p.id, label)
                    kit_demand[key] = kit_demand.get(key, 0) + line.quantity
                    stock = p.stock_for(label) or 0
                    if stock < kit_demand[key]:
                        issues.append(f"Only {stock} left in size {label}." if stock else f"Size {label} is sold out.")

        elif line.kind == "custom":
            design = _design_for(db, line.design_public_id or "", user)
            if design is None:
                issues.append("We couldn't find this custom design.")
            else:
                config = design.config
                analysis = analyse_design(db, DesignConfig.model_validate(design.config), sets=line.quantity)
                name, image, unit = design.name, None, analysis.price_paise
                lead = pricing["custom_lead_days"]
                if design.status == "rejected":
                    issues.append("This design needs changes before it can be ordered.")
                issues += analysis.errors
                for bom in analysis.bom:
                    if bom.element_type == "charm":
                        charm_demand[bom.slug] = charm_demand.get(bom.slug, 0) + bom.quantity * line.quantity

        elif line.kind == "gift_bundle":
            bundle = db.get(GiftBundle, line.gift_bundle_id)
            if bundle is None or not bundle.is_active:
                issues.append("This gift bundle is no longer available.")
            else:
                name, unit = bundle.name, bundle.price_paise
                if bundle.product:
                    art = product_art(bundle.product)
                    image = bundle.product.images[0].url if bundle.product.images else None
                    if not bundle.product.is_active:
                        issues.append(f"{bundle.product.name} is no longer available.")
                    if line.size is None:
                        issues.append("Please choose a size for the nail set in this bundle.")
                for bi in bundle.items:
                    item_demand[bi.item_id] = item_demand.get(bi.item_id, 0) + bi.quantity * line.quantity
                    if not bi.item.is_active or bi.item.stock < item_demand[bi.item_id]:
                        issues.append(f"{bi.item.name} is out of stock.")

        elif line.kind == "gift_item":
            item = db.get(GiftItem, line.gift_item_id)
            if item is None or not item.is_active:
                issues.append("This add-on is no longer available.")
            else:
                name, unit, image = item.name, item.price_paise, item.image_url
                item_demand[item.id] = item_demand.get(item.id, 0) + line.quantity
                if item.stock < item_demand[item.id]:
                    issues.append(f"Only {item.stock} left." if item.stock else "Sold out.")

        quoted.append(QuotedLine(
            index=index, kind=line.kind, name=name, image_url=image, art=art, design_config=config,
            unit_price_paise=unit, quantity=line.quantity, line_total_paise=unit * line.quantity,
            size=line.size, lead_days=lead, issues=issues,
        ))

    # Charm stock across all custom lines together.
    if charm_demand:
        charms = {c.slug: c for c in db.scalars(select(Charm).where(Charm.slug.in_(charm_demand)))}
        for slug, needed in charm_demand.items():
            if slug in charms and charms[slug].stock < needed:
                for q in quoted:
                    if q.kind == "custom" and not q.issues:
                        q.issues.append(f"Not enough {charms[slug].name} charms for all custom sets in your bag.")

    subtotal = sum(q.line_total_paise for q in quoted if not q.issues)
    threshold = pricing["free_shipping_over_paise"]
    shipping = 0 if subtotal == 0 or subtotal >= threshold else pricing["shipping_flat_paise"]
    return CartQuoteOut(
        lines=quoted,
        subtotal_paise=subtotal,
        shipping_paise=shipping,
        discount_paise=0,
        total_paise=subtotal + shipping,
        free_shipping_threshold_paise=threshold,
        free_shipping_remaining_paise=max(0, threshold - subtotal),
        estimated_dispatch_days=max((q.lead_days for q in quoted), default=0),
        valid=bool(quoted) and all(not q.issues for q in quoted),
    )


def _order_number() -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return f"NN-{datetime.now(UTC):%y%m%d}-" + "".join(secrets.choice(alphabet) for _ in range(5))


def _decrement(db: Session, model, where, column, amount: int) -> None:
    """Atomic conditional decrement — fails instead of overselling under concurrency."""
    result = db.execute(update(model).where(*where, column >= amount).values({column: column - amount}))
    if result.rowcount != 1:
        raise HTTPException(status.HTTP_409_CONFLICT, "Something in your bag just sold out — please review it.")


def create_order(db: Session, data: CheckoutIn, user: User | None) -> Order:
    quote = quote_cart(db, data.lines, user)
    if not quote.valid:
        problems = [f"{q.name}: {issue}" for q in quote.lines for issue in q.issues]
        raise HTTPException(status.HTTP_409_CONFLICT, {"message": "Please review your bag.", "issues": problems})

    pricing = get_setting(db, "pricing")
    cod_fee = pricing["cod_fee_paise"] if data.payment_method == "cod" else 0
    order = Order(
        number=_order_number(),
        user_id=user.id if user else None,
        email=data.email.lower(),
        shipping=data.shipping.model_dump(),
        notes=data.notes,
        subtotal_paise=quote.subtotal_paise,
        shipping_paise=quote.shipping_paise + cod_fee,
        discount_paise=quote.discount_paise,
        total_paise=quote.total_paise + cod_fee,
        payment_method=data.payment_method,
        payment_status="PENDING",
        status=OrderStatus.NEW,
    )
    has_custom = False
    ai_ids: set[int] = set()

    for line, q in zip(data.lines, quote.lines, strict=True):
        item = OrderItem(
            kind=line.kind, name=q.name, image_url=q.image_url, unit_price_paise=q.unit_price_paise,
            quantity=line.quantity, sizes=line.size.model_dump() if line.size else None,
            snapshot={"art": q.art} if q.art else {}, gift_message=line.gift_message,
            ai_request_id=line.ai_request_id,
        )
        if line.ai_request_id:
            ai_ids.add(line.ai_request_id)

        if line.kind == "product":
            p = db.get(Product, line.product_id)
            item.product_id = p.id
            p.popularity += line.quantity
            if line.size.label != "CUSTOM":
                _decrement(db, Inventory, (Inventory.product_id == p.id, Inventory.size_label == line.size.label),
                           Inventory.quantity, line.quantity)
            item.customization = OrderCustomization(
                shape=p.shape.name if p.shape else None, length=p.length,
                finish=p.finish.name if p.finish else None,
                base_colour=p.base_colour.name if p.base_colour else None,
                charms=[{"type": pc.charm.slug, "quantity": pc.quantity} for pc in p.charms],
                sizes=line.size.model_dump(),
            )

        elif line.kind == "custom":
            has_custom = True
            design = _design_for(db, line.design_public_id, user)
            item.custom_design_id = design.id
            item.snapshot = {"config": design.config, "bill_of_materials": production_charms(design)}
            for el in design.elements:
                if el.element_type == "charm":
                    _decrement(db, Charm, (Charm.id == el.element_id,), Charm.stock, el.quantity * line.quantity)
            if design.user_id is None and user is not None:
                design.user_id = user.id
            if design.status in ("draft", "rejected"):
                design.status = "submitted"
            item.customization = OrderCustomization(
                shape=design.shape.name if design.shape else None, length=design.length,
                finish=design.finish.name if design.finish else None,
                base_colour=design.base_colour.name if design.base_colour else None,
                charms=production_charms(design), sizes=line.size.model_dump() if line.size else None,
                notes=design.brief,
            )

        elif line.kind == "gift_bundle":
            bundle = db.get(GiftBundle, line.gift_bundle_id)
            item.gift_bundle_id = bundle.id
            item.snapshot = {**item.snapshot, "contents": [
                {"name": bi.item.name, "quantity": bi.quantity} for bi in bundle.items
            ] + ([{"name": bundle.product.name, "quantity": 1}] if bundle.product else [])}
            for bi in bundle.items:
                _decrement(db, GiftItem, (GiftItem.id == bi.item_id,), GiftItem.stock, bi.quantity * line.quantity)

        elif line.kind == "gift_item":
            item.gift_item_id = line.gift_item_id
            _decrement(db, GiftItem, (GiftItem.id == line.gift_item_id,), GiftItem.stock, line.quantity)

        order.items.append(item)

    order.events.append(OrderStatusEvent(status=OrderStatus.NEW, note=STATUS_NOTES[OrderStatus.NEW]))
    if has_custom:
        order.status = OrderStatus.DESIGN_REVIEW
        order.events.append(OrderStatusEvent(status=OrderStatus.DESIGN_REVIEW,
                                             note=STATUS_NOTES[OrderStatus.DESIGN_REVIEW]))
    db.add(order)
    db.flush()
    if ai_ids:
        # Only the customer's own (or anonymous) AI requests can be marked as converted.
        db.execute(update(AIRequest).where(
            AIRequest.id.in_(ai_ids),
            (AIRequest.user_id.is_(None)) | (AIRequest.user_id == (user.id if user else -1)),
        ).values(converted=True, converted_order_id=order.id))
    db.commit()
    db.refresh(order)
    return order


def _restock(db: Session, order: Order) -> None:
    for item in order.items:
        if item.kind == "product" and item.product_id and item.sizes and item.sizes.get("label") != "CUSTOM":
            inv = db.scalar(select(Inventory).where(Inventory.product_id == item.product_id,
                                                    Inventory.size_label == item.sizes["label"]))
            if inv:
                inv.quantity += item.quantity
        elif item.kind == "custom" and item.custom_design:
            for el in item.custom_design.elements:
                if el.element_type == "charm" and (charm := db.get(Charm, el.element_id)):
                    charm.stock += el.quantity * item.quantity
        elif item.kind == "gift_item" and item.gift_item_id and (gi := db.get(GiftItem, item.gift_item_id)):
            gi.stock += item.quantity
        elif item.kind == "gift_bundle" and item.gift_bundle_id and (b := db.get(GiftBundle, item.gift_bundle_id)):
            for bi in b.items:
                bi.item.stock += bi.quantity * item.quantity


def change_status(db: Session, order: Order, new_status: str, note: str, actor: User | None,
                  tracking_number: str | None = None, courier: str | None = None) -> Order:
    if new_status == order.status:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Order already has that status.")
    if new_status not in ALLOWED_TRANSITIONS[OrderStatus(order.status)]:
        raise HTTPException(status.HTTP_400_BAD_REQUEST,
                            f"An order can't move from {order.status} to {new_status}.")
    if new_status == OrderStatus.SHIPPED and not (tracking_number or order.tracking_number):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Add a tracking number before marking as shipped.")
    if new_status == OrderStatus.CANCELLED:
        _restock(db, order)
    if new_status == OrderStatus.APPROVED:
        for item in order.items:
            if item.custom_design and item.custom_design.status != "approved":
                item.custom_design.status = "approved"
    order.status = new_status
    if tracking_number:
        order.tracking_number = tracking_number
    if courier:
        order.courier = courier
    order.events.append(OrderStatusEvent(status=new_status, note=note or STATUS_NOTES[OrderStatus(new_status)],
                                         created_by=actor.id if actor else None))
    db.commit()
    db.refresh(order)
    return order


def reorder_lines(order: Order) -> list[dict]:
    """Cart lines that recreate a previous order (re-priced by the client via /cart/quote)."""
    lines = []
    for item in order.items:
        base = {"kind": item.kind, "quantity": item.quantity, "size": item.sizes}
        if item.kind == "product" and item.product_id:
            lines.append({**base, "product_id": item.product_id})
        elif item.kind == "custom" and item.custom_design:
            lines.append({**base, "design_public_id": item.custom_design.public_id})
        elif item.kind == "gift_bundle" and item.gift_bundle_id:
            lines.append({**base, "gift_bundle_id": item.gift_bundle_id})
        elif item.kind == "gift_item" and item.gift_item_id:
            lines.append({**base, "gift_item_id": item.gift_item_id, "size": None})
    return lines
