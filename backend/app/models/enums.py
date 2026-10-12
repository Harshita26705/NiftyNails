from enum import StrEnum


class RoleName(StrEnum):
    CUSTOMER = "customer"
    STAFF = "staff"
    ADMIN = "admin"


class OrderStatus(StrEnum):
    NEW = "NEW"
    DESIGN_REVIEW = "DESIGN_REVIEW"
    APPROVED = "APPROVED"
    IN_PRODUCTION = "IN_PRODUCTION"
    READY = "READY"
    SHIPPED = "SHIPPED"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"


class PaymentStatus(StrEnum):
    PENDING = "PENDING"
    PAID = "PAID"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"


class PaymentMethod(StrEnum):
    COD = "cod"
    UPI_MANUAL = "upi_manual"
    ONLINE = "online"  # gateway provider (Razorpay etc.) once configured


class OrderItemKind(StrEnum):
    PRODUCT = "product"
    CUSTOM = "custom"
    GIFT_BUNDLE = "gift_bundle"
    GIFT_ITEM = "gift_item"


class DesignSource(StrEnum):
    CHAT = "chat"
    DRAW = "draw"
    STYLIST = "stylist"


class DesignStatus(StrEnum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    REJECTED = "rejected"  # shown to customers/admin as "Needs changes"
    PRODUCTION = "production"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class DesignElementType(StrEnum):
    CHARM = "charm"
    COLOUR = "colour"
    FINISH = "finish"
    PATTERN = "pattern"


class GiftItemType(StrEnum):
    BOX = "box"
    CARD = "card"
    CARE = "care"
    ACCESSORY = "accessory"
    PACKAGING = "packaging"


class AIRequestKind(StrEnum):
    SEARCH = "search"
    STYLIST = "stylist"
    CHAT = "chat"
    GIFT = "gift"
    SIZING = "sizing"
    TONE = "tone"


class NailLength(StrEnum):
    SHORT = "short"
    MEDIUM = "medium"
    LONG = "long"
    XLONG = "xlong"


class Difficulty(StrEnum):
    SIMPLE = "simple"
    DETAILED = "detailed"
    INTRICATE = "intricate"


FINGERS = ("thumb", "index", "middle", "ring", "pinky")
SIZE_OPTIONS = ("XS", "S", "M", "L", "CUSTOM")
