"""Admin dashboard metrics. All aggregates run in SQL; cancelled orders are excluded from revenue."""

from collections import Counter
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import Date, and_, cast, func, select
from sqlalchemy.orm import Session

from app.models import (
    AIRequest,
    Charm,
    Colour,
    CustomDesign,
    CustomDesignElement,
    Inventory,
    Order,
    OrderItem,
    Product,
    ProductCharm,
    ProductColour,
    Role,
    User,
)
from app.models.enums import OrderStatus

OPEN_STATUSES = (OrderStatus.NEW, OrderStatus.DESIGN_REVIEW, OrderStatus.APPROVED, OrderStatus.IN_PRODUCTION,
                 OrderStatus.READY)


def dashboard(db: Session, days: int = 30) -> dict:
    since = datetime.now(UTC) - timedelta(days=days)
    live = Order.status != OrderStatus.CANCELLED

    total_sales, order_count = db.execute(
        select(func.coalesce(func.sum(Order.total_paise), 0), func.count(Order.id)).where(live)
    ).one()
    period_sales, period_orders = db.execute(
        select(func.coalesce(func.sum(Order.total_paise), 0), func.count(Order.id)).where(live, Order.created_at >= since)
    ).one()
    pending = db.scalar(select(func.count(Order.id)).where(Order.status.in_(OPEN_STATUSES))) or 0
    design_review = db.scalar(select(func.count(Order.id)).where(Order.status == OrderStatus.DESIGN_REVIEW)) or 0
    custom_orders = db.scalar(
        select(func.count(func.distinct(OrderItem.order_id))).join(Order).where(OrderItem.kind == "custom", live)
    ) or 0
    customers = db.scalar(select(func.count(User.id)).join(Role).where(Role.name == "customer")) or 0
    designs_waiting = db.scalar(select(func.count(CustomDesign.id)).where(CustomDesign.status == "submitted")) or 0

    ai_total = db.scalar(select(func.count(AIRequest.id)).where(AIRequest.kind.in_(("search", "stylist", "chat", "gift"))))
    ai_converted = db.scalar(select(func.count(AIRequest.id)).where(AIRequest.converted.is_(True)))
    ai_review = db.scalar(select(func.count(AIRequest.id)).where(AIRequest.needs_review.is_(True)))

    low_stock = db.scalar(
        select(func.count(Inventory.id)).join(Product).where(
            Product.is_active.is_(True), Inventory.quantity <= Inventory.low_stock_threshold
        )
    ) or 0
    low_charms = db.scalar(select(func.count(Charm.id)).where(Charm.is_active.is_(True), Charm.stock <= 10)) or 0

    return {
        "period_days": days,
        "total_sales_paise": int(total_sales),
        "orders": int(order_count),
        "period_sales_paise": int(period_sales),
        "period_orders": int(period_orders),
        "average_order_value_paise": int(total_sales / order_count) if order_count else 0,
        "pending_orders": pending,
        "design_review_orders": design_review,
        "custom_orders": custom_orders,
        "customers": customers,
        "designs_awaiting_review": designs_waiting,
        "ai_requests": ai_total or 0,
        "ai_conversions": ai_converted or 0,
        "ai_conversion_rate": round((ai_converted or 0) / ai_total, 4) if ai_total else 0.0,
        "ai_needs_review": ai_review or 0,
        "low_stock_variants": low_stock,
        "low_stock_charms": low_charms,
        "popular_designs": popular_designs(db),
        "popular_charms": popular_charms(db),
        "popular_colours": popular_colours(db),
        "sales_by_day": sales_by_day(db, days),
        "status_breakdown": status_breakdown(db),
    }


def popular_designs(db: Session, limit: int = 6) -> list[dict]:
    stmt = (
        select(Product.id, Product.name, Product.slug, func.sum(OrderItem.quantity).label("units"),
               func.sum(OrderItem.quantity * OrderItem.unit_price_paise).label("revenue"))
        .join(OrderItem, OrderItem.product_id == Product.id)
        .join(Order, and_(Order.id == OrderItem.order_id, Order.status != OrderStatus.CANCELLED))
        .group_by(Product.id, Product.name, Product.slug)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(limit)
    )
    return [{"id": r.id, "name": r.name, "slug": r.slug, "units": int(r.units), "revenue_paise": int(r.revenue)}
            for r in db.execute(stmt)]


def popular_charms(db: Session, limit: int = 6) -> list[dict]:
    """Charm usage across sold ready-made sets and custom designs."""
    counts: Counter[str] = Counter()
    sold_products = (
        select(ProductCharm.charm_id, func.sum(ProductCharm.quantity * OrderItem.quantity))
        .join(OrderItem, OrderItem.product_id == ProductCharm.product_id)
        .join(Order, and_(Order.id == OrderItem.order_id, Order.status != OrderStatus.CANCELLED))
        .group_by(ProductCharm.charm_id)
    )
    charms = {c.id: c for c in db.scalars(select(Charm))}
    names = {c.slug: c.name for c in charms.values()}
    for charm_id, qty in db.execute(sold_products):
        if charm_id in charms:
            counts[charms[charm_id].slug] += int(qty)
    custom = (
        select(CustomDesignElement.element_slug, func.sum(CustomDesignElement.quantity))
        .where(CustomDesignElement.element_type == "charm")
        .group_by(CustomDesignElement.element_slug)
    )
    for slug, qty in db.execute(custom):
        counts[slug] += int(qty)
    return [{"slug": s, "name": names.get(s, s), "uses": n} for s, n in counts.most_common(limit)]


def popular_colours(db: Session, limit: int = 8) -> list[dict]:
    counts: Counter[int] = Counter()
    sold = (
        select(ProductColour.colour_id, func.sum(OrderItem.quantity))
        .join(OrderItem, OrderItem.product_id == ProductColour.product_id)
        .join(Order, and_(Order.id == OrderItem.order_id, Order.status != OrderStatus.CANCELLED))
        .group_by(ProductColour.colour_id)
    )
    for colour_id, qty in db.execute(sold):
        counts[colour_id] += int(qty)
    custom = (
        select(CustomDesignElement.element_id, func.count())
        .where(CustomDesignElement.element_type == "colour")
        .group_by(CustomDesignElement.element_id)
    )
    for colour_id, n in db.execute(custom):
        counts[colour_id] += int(n)
    colours = {c.id: c for c in db.scalars(select(Colour).where(Colour.id.in_(list(counts))))}
    return [{"slug": colours[cid].slug, "name": colours[cid].name, "hex": colours[cid].hex, "uses": n}
            for cid, n in counts.most_common(limit) if cid in colours]


def sales_by_day(db: Session, days: int) -> list[dict]:
    start = (datetime.now(UTC) - timedelta(days=days - 1)).date()
    day = cast(Order.created_at, Date)
    rows = db.execute(
        select(day, func.sum(Order.total_paise), func.count(Order.id))
        .where(Order.status != OrderStatus.CANCELLED, Order.created_at >= datetime.combine(start, datetime.min.time(), UTC))
        .group_by(day)
    ).all()
    by_day = {(r[0] if isinstance(r[0], date) else date.fromisoformat(str(r[0]))): (int(r[1]), int(r[2])) for r in rows}
    return [
        {"date": (start + timedelta(days=i)).isoformat(),
         "sales_paise": by_day.get(start + timedelta(days=i), (0, 0))[0],
         "orders": by_day.get(start + timedelta(days=i), (0, 0))[1]}
        for i in range(days)
    ]


def status_breakdown(db: Session) -> dict[str, int]:
    rows = db.execute(select(Order.status, func.count(Order.id)).group_by(Order.status)).all()
    counts = {s.value: 0 for s in OrderStatus}
    counts.update({status: int(n) for status, n in rows})
    return counts
