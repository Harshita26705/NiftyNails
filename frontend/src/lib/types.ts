// Types mirroring the FastAPI schemas (backend/app/schemas). Money is always integer paise.

export type Ref = { id: number; name: string; slug: string };
export type ShapeKey = "almond" | "coffin" | "square" | "oval" | "stiletto" | "squoval";
export type NailLength = "short" | "medium" | "long" | "xlong";
export type SizeLabel = "XS" | "S" | "M" | "L" | "CUSTOM";
export type Finger = "thumb" | "index" | "middle" | "ring" | "pinky";
export const FINGERS: Finger[] = ["thumb", "index", "middle", "ring", "pinky"];

export type NailArt = {
  shape: ShapeKey;
  length: NailLength;
  base: string;
  accents: string[];
  finish: string;
  pattern: string | null;
  charms: string[];
  accent_nails?: number[];
  gradient?: boolean;
};

export type ProductImage = { id: number; url: string; alt: string; position: number };

export type Product = {
  id: number;
  sku: string;
  slug: string;
  name: string;
  tagline: string;
  price_paise: number;
  compare_at_paise: number | null;
  category: Ref | null;
  style: Ref | null;
  shape: (Ref & { svg_key: ShapeKey }) | null;
  finish: Ref | null;
  length: NailLength;
  difficulty: string;
  colours: { name: string; slug: string; hex: string; role: "base" | "accent" }[];
  charms: { name: string; slug: string; asset_key: string; quantity: number }[];
  tags: Ref[];
  images: ProductImage[];
  art: NailArt;
  is_featured: boolean;
  is_active: boolean;
  in_stock: boolean;
};

export type ProductDetail = Product & {
  description: string;
  patterns: Ref[];
  occasions: Ref[];
  available_sizes: SizeLabel[];
  size_availability: Record<string, number | null>;
  rating_average: number | null;
  rating_count: number;
};

export type Page<T> = { items: T[]; total: number; page: number; page_size: number };

export type Lookup = Ref & { description: string; synonyms: string[]; is_active: boolean; sort_order: number };
export type Colour = Lookup & { hex: string; family: string };
export type Finish = Lookup & { surcharge_paise: number; flashiness: number };
export type Shape = Lookup & { svg_key: ShapeKey; surcharge_paise: number };
export type Pattern = Lookup & { surcharge_paise: number };
export type Charm = Lookup & {
  category: string;
  asset_key: string;
  image_url: string | null;
  price_paise: number;
  stock: number;
  is_3d: boolean;
  flashiness: number;
};
export type NailSize = { size: number; width_mm: number; length_mm: number | null };
export type SizeKit = { label: string; fingers: Record<Finger, number>; sort_order: number };

export type CatalogOptions = {
  categories: (Lookup & { image_url: string | null })[];
  styles: Lookup[];
  occasions: Lookup[];
  patterns: Pattern[];
  tags: Lookup[];
  colours: Colour[];
  finishes: Finish[];
  shapes: Shape[];
  charms: Charm[];
  nail_sizes: NailSize[];
  size_kits: SizeKit[];
  price_range: [number, number];
};

export type Review = {
  id: number;
  author_name: string;
  rating: number;
  title: string;
  body: string;
  created_at: string;
  product_name?: string | null;
  product_slug?: string | null;
};

export type User = {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  role_name: "customer" | "staff" | "admin";
  created_at: string;
};

export type SiteContent = {
  announcement: string;
  hero_title: string;
  hero_subtitle: string;
  instagram_handle: string;
  support_email: string;
  free_shipping_over_paise: number;
  custom_lead_days: number;
  custom_base_paise: number;
};

// ---------------------------------------------------------------- AI

export type Unavailable = {
  requested: string;
  kind: string;
  reason: string;
  suggestion_slug: string | null;
  suggestion_name: string | null;
  message: string;
};

export type ParsedAttributes = {
  colours: string[];
  finishes: string[];
  shapes: string[];
  charms: Record<string, number | null>;
  chips: string[];
  price_max_paise: number | null;
  flash_preference: string | null;
};

export type Match = { product: Product; match_percent: number; matched: string[]; missing: string[] };

export type SearchResult = {
  request_id: number;
  attributes: ParsedAttributes;
  unavailable: Unavailable[];
  matches: Match[];
  message: string;
};

export type StylistResult = {
  request_id: number;
  summary: string;
  palette: { hex: string; weight: number; name: string; closest_catalogue_colour: { slug: string; name: string; hex: string } | null }[];
  metallic: string | null;
  pattern: string;
  style_keywords: string[];
  attributes: ParsedAttributes;
  matches: Match[];
};

export type SizingResult = {
  request_id: number | null;
  ok: boolean;
  fingers: { finger: Finger; width_mm: number | null; nail_width_mm: number | null; size: number | null; confidence: number }[];
  overall_confidence: number;
  confidence_label: "high" | "medium" | "low";
  recommendation: "confident" | "verify" | "manual";
  closest_kit: string | null;
  reference: Record<string, unknown> | null;
  handedness: string | null;
  warnings: string[];
  preview_image: string | null;
};

export type CharmPlacement = { charm: string; x: number; y: number; scale: number; rotation: number };

// ---------------------------------------------------------------- design studio objects (strokes/shapes/text/
// gradients/French tips). Structured and editable, clipped to the nail outline — never flattened to a bitmap.

export type ObjectBase = { id: string; name: string; hidden: boolean; locked: boolean; opacity: number };
export type Point = { x: number; y: number };

export type StrokeObject = ObjectBase & {
  type: "stroke"; points: Point[]; width: number; color: string; brush: "round" | "flat" | "marker";
};
export type ShapeKind = "circle" | "rect" | "rounded_rect" | "triangle" | "polygon" | "star" | "heart" | "diamond" | "line";
export type ShapeObject = ObjectBase & {
  type: "shape"; shape: ShapeKind; x: number; y: number; scale: number; rotation: number;
  fill: string | null; stroke: string | null; stroke_width: number; sides: number;
};
export type TextObject = ObjectBase & {
  type: "text"; x: number; y: number; scale: number; rotation: number; text: string;
  font: "display" | "sans"; size: number; color: string; align: "left" | "center" | "right";
};
export type GradientStop = { color: string; offset: number };
export type GradientObject = ObjectBase & { type: "gradient"; stops: GradientStop[]; angle: number };
export type FrenchTipStyle = "classic" | "deep" | "micro" | "colored" | "double" | "asymmetric";
export type FrenchTipObject = ObjectBase & {
  type: "french_tip"; style: FrenchTipStyle; color: string; secondary_color: string | null;
  depth: number; curve: number; thickness: number; offset_x: number; offset_y: number;
};
export type ImageObject = ObjectBase & {
  type: "image"; x: number; y: number; scale: number; rotation: number; url: string;
};
export type DesignObject = StrokeObject | ShapeObject | TextObject | GradientObject | FrenchTipObject | ImageObject;
export type DesignObjectType = DesignObject["type"];

export type NailConfig = {
  colour?: string | null;
  finish?: string | null;
  pattern?: string | null;
  pattern_colour?: string | null;
  paint?: string | null;
  charms: CharmPlacement[];
  objects: DesignObject[];
};
export type NailKey = "L1" | "L2" | "L3" | "L4" | "L5" | "R1" | "R2" | "R3" | "R4" | "R5";
export const NAIL_KEYS: NailKey[] = ["L1", "L2", "L3", "L4", "L5", "R1", "R2", "R3", "R4", "R5"];
export type DesignConfig = {
  version?: number;
  shape: string;
  length: NailLength;
  base_colour: string;
  finish: string;
  nails: Partial<Record<NailKey, NailConfig>>;
  notes?: string;
};

export type BomLine = {
  element_type: string;
  slug: string;
  name: string;
  quantity: number;
  nail_positions: string[];
  unit_cost_paise: number;
};

export type DesignQuote = {
  price_paise: number;
  breakdown: { label: string; amount_paise: number }[];
  bill_of_materials: BomLine[];
  warnings: string[];
  manufacturable: boolean;
  complexity: number;
  tier: string;
};

export type DesignStatus =
  | "draft" | "submitted" | "in_review" | "approved" | "rejected" | "production" | "completed" | "cancelled";

export type Design = {
  id: number;
  public_id: string;
  name: string;
  source: "chat" | "draw" | "stylist";
  status: DesignStatus;
  config: DesignConfig;
  brief: string;
  price_paise: number;
  review_notes: string;
  created_at: string;
  updated_at: string;
  bill_of_materials: BomLine[];
  complexity: number;
  tier: string;
};

export type ChatState = Record<string, unknown>;
export type ChatTurn = {
  reply: string;
  quick_replies: string[];
  notices: { kind: "unavailable" | "info" | "warning"; text: string }[];
  state: ChatState;
  design: DesignConfig | null;
  quote: DesignQuote | null;
  complete: boolean;
};

export type GiftLine = { kind: "product" | "gift_item"; id: number; name: string; price_paise: number; item_type: string; personalisable: boolean };
export type GiftOption = {
  title: string;
  product: Product | null;
  lines: GiftLine[];
  total_paise: number;
  budget_left_paise: number;
  match_percent: number | null;
  reasons: string[];
  bundle_id: number | null;
  bundle_saving_paise: number;
};

// ---------------------------------------------------------------- cart & orders

export type SizeSelection = { label: SizeLabel; fingers?: Record<Finger, number> | null };

export type CartLine = {
  key: string;
  kind: "product" | "custom" | "gift_bundle" | "gift_item";
  product_id?: number;
  design_public_id?: string;
  gift_bundle_id?: number;
  gift_item_id?: number;
  quantity: number;
  size?: SizeSelection | null;
  gift_message?: string | null;
  ai_request_id?: number | null;
  // display cache (re-validated by /cart/quote)
  name: string;
  art?: NailArt | null;
  design_config?: DesignConfig | null;
  image_url?: string | null;
  price_paise: number;
  slug?: string;
};

export type QuotedLine = {
  index: number;
  kind: string;
  name: string;
  image_url: string | null;
  art: NailArt | null;
  design_config: DesignConfig | null;
  unit_price_paise: number;
  quantity: number;
  line_total_paise: number;
  size: SizeSelection | null;
  lead_days: number;
  issues: string[];
};

export type CartQuote = {
  lines: QuotedLine[];
  subtotal_paise: number;
  shipping_paise: number;
  discount_paise: number;
  total_paise: number;
  free_shipping_threshold_paise: number;
  free_shipping_remaining_paise: number;
  estimated_dispatch_days: number;
  valid: boolean;
};

export type OrderStatus =
  | "NEW" | "DESIGN_REVIEW" | "APPROVED" | "IN_PRODUCTION" | "READY" | "SHIPPED" | "DELIVERED" | "CANCELLED";

export type OrderItem = {
  id: number;
  kind: string;
  product_id: number | null;
  custom_design_id: number | null;
  gift_bundle_id: number | null;
  gift_item_id: number | null;
  name: string;
  image_url: string | null;
  unit_price_paise: number;
  quantity: number;
  line_total_paise: number;
  sizes: SizeSelection | null;
  snapshot: { art?: NailArt; config?: DesignConfig; bill_of_materials?: { type: string; quantity: number; nails?: string[] }[]; contents?: { name: string; quantity: number }[] };
  gift_message: string | null;
  customization: {
    shape: string | null;
    length: string | null;
    finish: string | null;
    base_colour: string | null;
    charms: { type: string; quantity: number; nails?: string[] }[];
    sizes: SizeSelection | null;
    notes: string;
  } | null;
};

export type Order = {
  id: number;
  number: string;
  email: string;
  shipping: Record<string, string>;
  notes: string;
  subtotal_paise: number;
  shipping_paise: number;
  discount_paise: number;
  total_paise: number;
  payment_method: string;
  payment_status: string;
  status: OrderStatus;
  tracking_number: string | null;
  courier: string | null;
  created_at: string;
  items: OrderItem[];
  events: { status: OrderStatus; note: string; created_at: string }[];
};

export type OrderSummary = {
  id: number;
  number: string;
  email: string;
  total_paise: number;
  status: OrderStatus;
  payment_status: string;
  payment_method: string;
  created_at: string;
  item_count: number;
  customer_name: string;
  has_custom: boolean;
};
