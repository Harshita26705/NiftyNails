import { useId } from "react";
import { darken, hashString, isDark, lighten, mix, paintFor, seeded } from "@/lib/colour";
import type { DesignObject } from "@/lib/types";
import { CharmArt } from "./charms";
import { frenchTipPath, heartPathAt, NAIL_WIDTH, nailHeight, nailPath, shapeGeometry } from "./shapes";

export type NailCharm = { kind: string; x: number; y: number; scale?: number; rotation?: number };

export type NailSpec = {
  shape: string;
  length: string;
  base: string;
  finish?: string | null;
  pattern?: string | null;
  patternColour?: string | null;
  accent2?: string | null;
  charms?: NailCharm[];
  paintUrl?: string | null;
  objects?: DesignObject[];
};

const W = NAIL_WIDTH;
const TEXT_ANCHOR = { left: "start", center: "middle", right: "end" } as const;

/** One nail as an SVG <g> in nail coordinates (width 100, height by length). Compose several in one <svg>. */
export function NailGroup({ spec, shadow = true }: { spec: NailSpec; shadow?: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const h = nailHeight(spec.length);
  const d = nailPath(spec.shape, h);
  const base = spec.base || "#F8C8D8";
  const finish = spec.finish ?? "glossy";
  const accent = spec.patternColour || (isDark(base) ? "#F6EBDF" : "#FFFFFF");
  const accent2 = spec.accent2 || darken(accent, 0.2);
  const clip = `nc-${uid}`;
  const seed = hashString(`${base}${spec.pattern}${finish}${spec.shape}`);

  return (
    <g filter={shadow ? "url(#nn-nail-shadow)" : undefined}>
      <defs>
        <clipPath id={clip}>
          <path d={d} />
        </clipPath>
        {finish === "chrome" && (
          <linearGradient id={`chrome-${uid}`} x1="0" y1="0" x2="1" y2="0.25">
            <stop offset="0%" stopColor={darken(base, 0.28)} />
            <stop offset="20%" stopColor={base} />
            <stop offset="40%" stopColor={lighten(base, 0.55)} />
            <stop offset="49%" stopColor="#ffffff" />
            <stop offset="58%" stopColor={lighten(base, 0.35)} />
            <stop offset="80%" stopColor={base} />
            <stop offset="100%" stopColor={darken(base, 0.32)} />
          </linearGradient>
        )}
        {finish === "cat-eye" && (
          <linearGradient id={`cat-${uid}`} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor={darken(base, 0.35)} />
            <stop offset="42%" stopColor={darken(base, 0.1)} />
            <stop offset="50%" stopColor={lighten(mix(base, "#d8c8ff", 0.4), 0.55)} />
            <stop offset="58%" stopColor={darken(base, 0.1)} />
            <stop offset="100%" stopColor={darken(base, 0.4)} />
          </linearGradient>
        )}
        {spec.pattern === "aura" && (
          <radialGradient id={`aura-${uid}`} cx="50%" cy="58%" r="45%">
            <stop offset="0%" stopColor={accent2 === accent ? darken(accent, 0.15) : accent2} stopOpacity="0.95" />
            <stop offset="55%" stopColor={accent2 === accent ? darken(accent, 0.15) : accent2} stopOpacity="0.45" />
            <stop offset="100%" stopColor={base} stopOpacity="0" />
          </radialGradient>
        )}
        {spec.pattern === "ombre" && (
          <linearGradient id={`ombre-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} />
            <stop offset="65%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        )}
      </defs>

      <g clipPath={`url(#${clip})`}>
        {/* body */}
        {finish === "jelly" && <rect x={-5} y={-5} width={W + 10} height={h + 10} fill="#ffffff" />}
        <rect x={-5} y={-5} width={W + 10} height={h + 10}
          fill={finish === "chrome" ? `url(#chrome-${uid})` : finish === "cat-eye" ? `url(#cat-${uid})` : base}
          fillOpacity={finish === "jelly" ? 0.72 : 1} />
        {finish === "jelly" && (
          <rect x={-5} y={-5} width={W + 10} height={h * 0.45} fill="#ffffff" opacity={0.28} />
        )}

        <Pattern kind={spec.pattern} h={h} base={base} accent={accent} accent2={accent2} uid={uid} seed={seed} />

        {spec.paintUrl && (
          <image href={spec.paintUrl} x={0} y={0} width={W} height={h} preserveAspectRatio="none" />
        )}

        {spec.objects && spec.objects.length > 0 && <Objects list={spec.objects} h={h} uid={uid} />}

        {finish === "glitter" && <Glitter h={h} base={base} seed={seed} />}
        {finish === "glazed" && (
          <>
            <rect x={-5} y={-5} width={W + 10} height={h + 10} fill="url(#nn-iridescent)" />
            <rect x={-5} y={-5} width={W + 10} height={h + 10} fill="url(#nn-glaze)" />
          </>
        )}
        {finish === "matte" ? (
          <rect x={-5} y={-5} width={W + 10} height={h + 10} fill="#ffffff" opacity={0.06} />
        ) : (
          <rect x={-5} y={-5} width={W + 10} height={h + 10} fill="url(#nn-depth)" />
        )}
        {finish !== "matte" && finish !== "chrome" && <Gloss h={h} strong={finish === "glossy" || finish === "jelly"} />}
      </g>

      <path d={d} fill="none" stroke={darken(base, 0.18)} strokeOpacity={0.22} strokeWidth={1} />

      {spec.charms?.map((c, i) => (
        <g key={i} transform={`translate(${c.x * W} ${c.y * h}) rotate(${c.rotation ?? 0}) scale(${c.scale ?? 1})`}
          filter="url(#nn-charm-shadow)">
          <CharmArt kind={c.kind} />
        </g>
      ))}
    </g>
  );
}

function Gloss({ h, strong }: { h: number; strong: boolean }) {
  return (
    <g opacity={strong ? 1 : 0.7}>
      <path d={`M 16 ${h * 0.2} C 13 ${h * 0.35} 13 ${h * 0.55} 17 ${h * 0.7} L 23 ${h * 0.69} C 20 ${h * 0.55} 20 ${h * 0.36} 23 ${h * 0.21} Z`}
        fill="url(#nn-gloss-v)" opacity={0.75} />
      <ellipse cx={74} cy={h * 0.16} rx={6} ry={3} fill="#ffffff" opacity={0.45} transform={`rotate(-30 74 ${h * 0.16})`} />
    </g>
  );
}

function Glitter({ h, base, seed }: { h: number; base: string; seed: number }) {
  const rand = seeded(seed);
  const colours = ["#ffffff", lighten(base, 0.6), "#f3d27a", "#ffd6ec"];
  return (
    <g>
      {Array.from({ length: 90 }, (_, i) => {
        const r = 0.6 + rand() * 1.8;
        return <circle key={i} cx={rand() * W} cy={rand() * h} r={r} fill={colours[i % colours.length]}
          opacity={0.45 + rand() * 0.5} />;
      })}
    </g>
  );
}

const heartPath = heartPathAt;

function Pattern({ kind, h, base, accent, accent2, uid, seed }: {
  kind?: string | null; h: number; base: string; accent: string; accent2: string; uid: string; seed: number;
}) {
  if (!kind) return null;
  const rand = seeded(seed + 7);
  switch (kind) {
    case "french-tip": {
      const t = h * 0.3;
      return <path d={`M -5 -5 L 105 -5 L 105 ${t * 0.55} Q 50 ${t * 1.45} -5 ${t * 0.55} Z`} fill={paintFor(accent)} />;
    }
    case "micro-french": {
      const t = h * 0.1;
      return <path d={`M -5 -5 L 105 -5 L 105 ${t * 0.7} Q 50 ${t * 1.6} -5 ${t * 0.7} Z`} fill={paintFor(accent)} />;
    }
    case "aura":
      return <rect x={-5} y={-5} width={W + 10} height={h + 10} fill={`url(#aura-${uid})`} />;
    case "ombre":
      return <rect x={-5} y={-5} width={W + 10} height={h + 10} fill={`url(#ombre-${uid})`} />;
    case "polka-dots": {
      const dots = [];
      for (let row = 0; row * 22 < h + 10; row++) {
        for (let col = 0; col < 6; col++) {
          dots.push(<circle key={`${row}-${col}`} cx={col * 22 + (row % 2 ? 11 : 0)} cy={row * 22 + 8} r={4.2} fill={accent} />);
        }
      }
      return <g>{dots}</g>;
    }
    case "hearts":
      return (
        <g fill={isDark(accent) ? accent : mix(accent, "#7a2e3a", 0.85)}>
          <path d={heartPath(36, h * 0.28, 2.3)} />
          <path d={heartPath(66, h * 0.52, 1.8)} />
          <path d={heartPath(38, h * 0.74, 1.4)} />
        </g>
      );
    case "florals":
      return (
        <g>
          {[[38, 0.28, 1.9], [66, 0.54, 1.5], [32, 0.76, 1.25]].map(([x, y, s], i) => (
            <g key={i} transform={`translate(${x} ${(y as number) * h}) scale(${s})`}>
              {Array.from({ length: 5 }, (_, p) => (
                <ellipse key={p} cy={-6} rx={4} ry={6.5} fill={accent} transform={`rotate(${p * 72})`} opacity={0.95} />
              ))}
              <circle r={3} fill={accent2 === accent ? "#f2b705" : accent2} />
            </g>
          ))}
        </g>
      );
    case "checkerboard": {
      const size = 16;
      const cells = [];
      for (let r = 0; r * size < h + size; r++)
        for (let c = 0; c * size < W + size; c++)
          if ((r + c) % 2 === 0) cells.push(<rect key={`${r}-${c}`} x={c * size - 4} y={r * size - 4} width={size} height={size} fill={accent} opacity={0.9} />);
      return <g>{cells}</g>;
    }
    case "marble":
      return (
        <g fill="none" strokeLinecap="round">
          <path d={`M -5 ${h * 0.25} C 25 ${h * 0.35} 40 ${h * 0.1} 70 ${h * 0.3} S 100 ${h * 0.5} 110 ${h * 0.45}`}
            stroke="#ffffff" strokeWidth={5} opacity={0.55} filter="url(#nn-soft-blur)" />
          <path d={`M -5 ${h * 0.25} C 25 ${h * 0.35} 40 ${h * 0.1} 70 ${h * 0.3} S 100 ${h * 0.5} 110 ${h * 0.45}`}
            stroke={paintFor(accent2 === accent ? "#D4AF37" : accent2)} strokeWidth={1.6} />
          <path d={`M 10 ${h + 5} C 20 ${h * 0.75} 50 ${h * 0.8} 60 ${h * 0.55} S 85 ${h * 0.35} 105 ${h * 0.2}`}
            stroke="#ffffff" strokeWidth={3.5} opacity={0.5} filter="url(#nn-soft-blur)" />
          <path d={`M 10 ${h + 5} C 20 ${h * 0.75} 50 ${h * 0.8} 60 ${h * 0.55} S 85 ${h * 0.35} 105 ${h * 0.2}`}
            stroke={accent} strokeWidth={0.9} opacity={0.9} />
        </g>
      );
    case "tortoiseshell":
      return (
        <g filter="url(#nn-soft-blur)">
          {Array.from({ length: 14 }, (_, i) => (
            <ellipse key={i} cx={rand() * W} cy={rand() * h} rx={6 + rand() * 10} ry={5 + rand() * 8}
              fill={i % 3 === 0 ? "#3a1a0c" : i % 3 === 1 ? "#8a4a1e" : "#c98a3c"} opacity={0.75} />
          ))}
        </g>
      );
    case "leopard":
      return (
        <g>
          {Array.from({ length: 9 }, (_, i) => {
            const x = 10 + rand() * 80, y = 8 + rand() * (h - 16), r = 6.5 + rand() * 4;
            return (
              <g key={i} transform={`translate(${x} ${y}) rotate(${rand() * 180})`}>
                <ellipse rx={r} ry={r * 0.75} fill={mix(base, "#8a4a1e", 0.35)} />
                <path d={`M ${-r - 1.5} 0 A ${r + 1.5} ${r * 0.75 + 1.5} 0 0 1 ${r * 0.4} ${-r * 0.75 - 1.2}`}
                  stroke="#1a0a08" strokeWidth={2.2} fill="none" strokeLinecap="round" />
                <path d={`M ${r + 1.5} 0 A ${r + 1.5} ${r * 0.75 + 1.5} 0 0 1 ${-r * 0.2} ${r * 0.75 + 1.3}`}
                  stroke="#1a0a08" strokeWidth={2.2} fill="none" strokeLinecap="round" />
              </g>
            );
          })}
        </g>
      );
    case "swirls":
      return (
        <g fill="none" strokeLinecap="round" strokeWidth={5.5}>
          <path d={`M -5 ${h * 0.2} C 30 ${h * 0.05} 45 ${h * 0.45} 105 ${h * 0.28}`} stroke={accent} opacity={0.95} />
          <path d={`M -5 ${h * 0.62} C 40 ${h * 0.45} 55 ${h * 0.85} 105 ${h * 0.66}`} stroke={accent2} opacity={0.85} />
        </g>
      );
    default:
      return null;
  }
}

/** Catmull-Rom → cubic-bezier smoothing so a hand-drawn point array reads as a smooth stroke, not a polyline. */
function smoothPath(points: { x: number; y: number }[], w: number, h: number): string {
  const p = points.map((pt) => [pt.x * w, pt.y * h] as const);
  if (p.length < 2) return "";
  if (p.length === 2) return `M ${p[0][0]} ${p[0][1]} L ${p[1][0]} ${p[1][1]}`;
  let d = `M ${p[0][0]} ${p[0][1]}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2] ?? p2;
    const c1: [number, number] = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: [number, number] = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${p2[0]} ${p2[1]}`;
  }
  return d;
}

/**
 * Design-studio objects (strokes/shapes/text/gradients/French tips) — rendered in array order, inside the
 * nail's own clipPath (set by the caller), so nothing a customer draws can visually leave the nail.
 */
function Objects({ list, h, uid }: { list: DesignObject[]; h: number; uid: string }) {
  return (
    <>
      {list.filter((o) => !o.hidden).map((o) => {
        switch (o.type) {
          case "stroke":
            return (
              <path key={o.id} d={smoothPath(o.points, W, h)} fill="none" stroke={o.color} strokeWidth={o.width}
                strokeOpacity={o.opacity} strokeLinecap={o.brush === "flat" ? "butt" : "round"} strokeLinejoin="round" />
            );
          case "shape": {
            const geo = shapeGeometry(o.shape, o.sides);
            return (
              <g key={o.id} opacity={o.opacity} transform={`translate(${o.x * W} ${o.y * h}) rotate(${o.rotation}) scale(${o.scale})`}
                fill={o.fill ?? "none"} stroke={o.stroke ?? "none"} strokeWidth={o.stroke ? o.stroke_width : 0}>
                {geo.tag === "ellipse" && <ellipse rx={10} ry={10} />}
                {geo.tag === "path" && <path d={geo.d} />}
                {geo.tag === "polygon" && <polygon points={geo.points} />}
              </g>
            );
          }
          case "text":
            return (
              <g key={o.id} transform={`translate(${o.x * W} ${o.y * h}) rotate(${o.rotation}) scale(${o.scale})`}>
                <text x={0} y={0} fill={o.color} fillOpacity={o.opacity} textAnchor={TEXT_ANCHOR[o.align]} dominantBaseline="middle"
                  fontSize={o.size} fontFamily={o.font === "display" ? "var(--font-display, serif)" : "var(--font-sans, sans-serif)"}>
                  {o.text}
                </text>
              </g>
            );
          case "gradient": {
            const gid = `obj-grad-${uid}-${o.id}`;
            const a = (o.angle * Math.PI) / 180;
            const dx = Math.sin(a) / 2, dy = -Math.cos(a) / 2;
            return (
              <g key={o.id}>
                <defs>
                  <linearGradient id={gid} x1={0.5 - dx} y1={0.5 - dy} x2={0.5 + dx} y2={0.5 + dy}>
                    {o.stops.map((s, i) => <stop key={i} offset={s.offset} stopColor={s.color} />)}
                  </linearGradient>
                </defs>
                <rect x={-5} y={-5} width={W + 10} height={h + 10} fill={`url(#${gid})`} opacity={o.opacity} />
              </g>
            );
          }
          case "french_tip": {
            // "thickness" scales how far the band extends (how bold the tip reads), independent of `depth`'s base shape.
            const effectiveDepth = Math.min(0.65, o.depth * o.thickness);
            const primary = frenchTipPath(h, effectiveDepth, o.curve, o.offset_x, o.offset_y);
            const secondary = o.style === "double"
              ? frenchTipPath(h, Math.max(0.03, effectiveDepth * 0.55), o.curve, o.offset_x, o.offset_y)
              : null;
            return (
              <g key={o.id} opacity={o.opacity}>
                <path d={primary} fill={o.color} />
                {secondary && <path d={secondary} fill={o.secondary_color ?? "#ffffff"} />}
              </g>
            );
          }
          case "image":
            return (
              <image key={o.id} href={o.url} opacity={o.opacity}
                x={o.x * W - 15 * o.scale} y={o.y * h - 15 * o.scale} width={30 * o.scale} height={30 * o.scale}
                transform={`rotate(${o.rotation} ${o.x * W} ${o.y * h})`} preserveAspectRatio="xMidYMid meet" />
            );
          default:
            return null;
        }
      })}
    </>
  );
}
