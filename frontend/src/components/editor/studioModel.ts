import { SMALL_CHARMS } from "@/components/nails/charms";
import type { NailSpec } from "@/components/nails/Nail";
import { CHARM_BASE_SCALE } from "@/lib/catalog";
import type { CatalogOptions, DesignConfig, DesignObject, NailKey, NailLength, ProductDetail } from "@/lib/types";
import { NAIL_KEYS } from "@/lib/types";
import type { EditorCharm } from "./CharmLayer";

export type StudioNail = {
  colour: string | null;
  finish: string | null;
  pattern: string | null;
  pattern_colour: string | null;
  paint: string | null;
  charms: EditorCharm[];
  objects: DesignObject[];
};

export type Studio = {
  shape: string;
  length: NailLength;
  base_colour: string;
  finish: string;
  nails: Record<NailKey, StudioNail>;
};

export const FINGER_NAME: Record<string, string> = { "1": "Thumb", "2": "Index", "3": "Middle", "4": "Ring", "5": "Pinky" };
export const nailLabel = (key: NailKey) => `${key[0] === "L" ? "Left" : "Right"} ${FINGER_NAME[key[1]].toLowerCase()}`;
export const mirrorKey = (key: NailKey) => `${key[0] === "L" ? "R" : "L"}${key[1]}` as NailKey;

let seq = 0;
export const charmId = () => `c${Date.now().toString(36)}${(seq++).toString(36)}`;
/** Design-studio object ids share the same generator — both just need to be unique within a nail. */
export const objectId = charmId;

export const emptyNail = (): StudioNail => ({ colour: null, finish: null, pattern: null, pattern_colour: null, paint: null, charms: [], objects: [] });

export function blankStudio(catalog: CatalogOptions | null): Studio {
  const colour = catalog?.colours.find((c) => c.slug === "baby-pink") ?? catalog?.colours[0];
  const finish = catalog?.finishes.find((f) => f.slug === "glossy") ?? catalog?.finishes[0];
  const shape = catalog?.shapes.find((s) => s.slug === "almond") ?? catalog?.shapes[0];
  return {
    shape: shape?.slug ?? "almond",
    length: "medium",
    base_colour: colour?.slug ?? "baby-pink",
    finish: finish?.slug ?? "glossy",
    nails: Object.fromEntries(NAIL_KEYS.map((k) => [k, emptyNail()])) as Record<NailKey, StudioNail>,
  };
}

/** Start the studio from an existing catalogue design ("Customise this design"). */
export function studioFromProduct(p: ProductDetail, catalog: CatalogOptions | null): Studio {
  const s = blankStudio(catalog);
  s.shape = p.shape?.slug ?? s.shape;
  s.length = p.length;
  s.finish = p.finish?.slug ?? s.finish;
  s.base_colour = p.colours.find((c) => c.role === "base")?.slug ?? p.colours[0]?.slug ?? s.base_colour;
  const accent = p.colours.find((c) => c.role !== "base")?.slug ?? null;
  const pattern = p.patterns[0]?.slug ?? null;
  const accentOnly = new Set(["hearts", "florals", "checkerboard", "leopard"]);
  const accentKeys: NailKey[] = p.charms.reduce((n, c) => n + c.quantity, 0) > 2 ? ["L4", "R4", "L2", "R2"] : ["L4", "R4"];

  for (const key of NAIL_KEYS) {
    const nail = s.nails[key];
    if (pattern && (!accentOnly.has(pattern) || ["L3", "R3"].includes(key))) {
      nail.pattern = pattern;
      nail.pattern_colour = accent;
    }
    if (accentKeys.includes(key) && p.charms.length) {
      const big = p.charms.filter((c) => !SMALL_CHARMS.has(c.asset_key));
      const small = p.charms.filter((c) => SMALL_CHARMS.has(c.asset_key));
      big.slice(0, 2).forEach((c, i) => nail.charms.push({ id: charmId(), charm: c.slug, x: 0.5, y: big.length > 1 ? [0.52, 0.26][i] : 0.46, scale: big.length > 1 ? 0.95 : 1.2, rotation: 0 }));
      small.slice(0, 1).forEach((c) => [0.3, 0.5, 0.7].forEach((x) => nail.charms.push({ id: charmId(), charm: c.slug, x, y: 0.8, scale: 0.8, rotation: 0 })));
    }
  }
  return s;
}

export function studioFromConfig(config: DesignConfig, catalog: CatalogOptions | null): Studio {
  const s = blankStudio(catalog);
  s.shape = config.shape;
  s.length = config.length;
  s.base_colour = config.base_colour;
  s.finish = config.finish;
  for (const key of NAIL_KEYS) {
    const n = config.nails?.[key];
    if (!n) continue;
    s.nails[key] = {
      colour: n.colour ?? null, finish: n.finish ?? null, pattern: n.pattern ?? null, pattern_colour: n.pattern_colour ?? null,
      paint: n.paint ?? null, charms: (n.charms ?? []).map((c) => ({ ...c, id: charmId() })),
      objects: (n.objects ?? []).map((o) => ({ ...o, id: objectId() })),
    };
  }
  return s;
}

/** `forQuote` swaps a data-URL image object's payload for a short marker, same idea as `paint` below. */
function objectForQuote(o: DesignObject): DesignObject {
  return o.type === "image" && o.url.startsWith("data:") ? { ...o, url: "uploaded" } : o;
}

/** The API contract (backend DesignConfig). `forQuote` swaps heavy paint/image data for a marker. */
export function toConfig(s: Studio, forQuote = false): DesignConfig {
  return {
    version: 1,
    shape: s.shape,
    length: s.length,
    base_colour: s.base_colour,
    finish: s.finish,
    nails: Object.fromEntries(NAIL_KEYS.map((k) => {
      const n = s.nails[k];
      return [k, {
        colour: n.colour, finish: n.finish, pattern: n.pattern, pattern_colour: n.pattern_colour,
        paint: n.paint ? (forQuote ? "painted" : n.paint) : null,
        charms: n.charms.map(({ charm, x, y, scale, rotation }) => ({
          charm, x: +x.toFixed(4), y: +y.toFixed(4), scale: +scale.toFixed(3), rotation: Math.round(rotation),
        })),
        objects: n.objects.filter((o) => !o.hidden || !forQuote).map((o) => forQuote ? objectForQuote(o) : o),
      }];
    })) as DesignConfig["nails"],
  };
}

/** Deep-copy one nail's content with fresh ids (for "copy to all" / "apply to selected"). */
export function cloneNailContent(source: StudioNail): StudioNail {
  return {
    ...source,
    charms: source.charms.map((c) => ({ ...c, id: charmId() })),
    objects: source.objects.map((o) => ({ ...o, id: objectId() })),
  };
}

/** Mirror one nail's content onto the other hand: flips horizontal position/angle, fresh ids. */
export function mirrorNailContent(source: StudioNail): StudioNail {
  const mirrorObject = (o: DesignObject): DesignObject => {
    const id = objectId();
    switch (o.type) {
      case "stroke":
        return { ...o, id, points: o.points.map((p) => ({ x: 1 - p.x, y: p.y })) };
      case "shape":
      case "text":
      case "image":
        return { ...o, id, x: 1 - o.x, rotation: -o.rotation };
      case "gradient":
        return { ...o, id, angle: (360 - o.angle) % 360 };
      case "french_tip":
        return { ...o, id, offset_x: -o.offset_x };
    }
  };
  return {
    ...source,
    charms: source.charms.map((c) => ({ ...c, id: charmId(), x: 1 - c.x, rotation: -c.rotation })),
    objects: source.objects.map(mirrorObject),
  };
}

/**
 * Renderable spec for one nail. `layers: false` (used for the studio's background render) excludes objects and
 * charms, which the stage draws itself as live interactive overlays (ObjectStage / CharmLayer). Legacy bitmap
 * paint has no interactive overlay of its own anymore, so it always renders here.
 */
export function nailSpec(s: Studio, key: NailKey, catalog: CatalogOptions | null, opts: { layers?: boolean } = {}): NailSpec {
  const n = s.nails[key];
  const hex = (slug: string | null) => (slug ? catalog?.colours.find((c) => c.slug === slug)?.hex : undefined);
  const asset = (slug: string) => catalog?.charms.find((c) => c.slug === slug)?.asset_key ?? slug;
  return {
    shape: catalog?.shapes.find((x) => x.slug === s.shape)?.svg_key ?? "almond",
    length: s.length,
    base: hex(n.colour) ?? hex(s.base_colour) ?? "#F8C8D8",
    finish: n.finish ?? s.finish,
    pattern: n.pattern,
    patternColour: hex(n.pattern_colour) ?? null,
    paintUrl: n.paint,
    objects: opts.layers === false ? [] : n.objects,
    charms: opts.layers === false ? [] : n.charms.map((c) => ({ kind: asset(c.charm), x: c.x, y: c.y, scale: c.scale * CHARM_BASE_SCALE, rotation: c.rotation })),
  };
}
