import { useId } from "react";
import { darken, hashString, isDark, lighten, mix, paintFor, seeded } from "@/lib/colour";
import { CharmArt } from "./charms";
import { NAIL_WIDTH, nailHeight, nailPath } from "./shapes";

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
};

const W = NAIL_WIDTH;

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

function heartPath(x: number, y: number, s: number) {
  return `M ${x} ${y + 6 * s} C ${x - 8 * s} ${y + 1 * s} ${x - 8 * s} ${y - 6 * s} ${x - 3.5 * s} ${y - 6 * s} C ${x - 1.5 * s} ${y - 6 * s} ${x} ${y - 4.5 * s} ${x} ${y - 3.5 * s} C ${x} ${y - 4.5 * s} ${x + 1.5 * s} ${y - 6 * s} ${x + 3.5 * s} ${y - 6 * s} C ${x + 8 * s} ${y - 6 * s} ${x + 8 * s} ${y + 1 * s} ${x} ${y + 6 * s} Z`;
}

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
        <g fill={isDark(accent) ? accent : mix(accent, "#e0218a", 0.85)}>
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
