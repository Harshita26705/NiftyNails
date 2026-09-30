/**
 * Vector artwork for charms. Each charm is drawn centred on (0, 0) at roughly ±12 units, in the nail
 * coordinate space (nail width = 100). Gradients live once in <NailDefs/> and are referenced by id.
 */

export const CHARM_KEYS = [
  "bow", "bow-pink", "pearl", "star-gold", "star-silver", "moon", "butterfly", "daisy", "rose-3d", "crystal",
  "heart", "strawberry-3d", "teddy-3d", "shell",
] as const;

/** Charms that read as "small" (placed in clusters near the cuticle). */
export const SMALL_CHARMS = new Set(["pearl", "crystal"]);

function Bow({ pink }: { pink?: boolean }) {
  const fill = pink ? "url(#nn-bow-pink)" : "url(#nn-bow-white)";
  const stroke = pink ? "#d9709d" : "#dccbd3";
  return (
    <g strokeWidth={0.7} stroke={stroke} strokeLinejoin="round">
      <path d="M-1 3 L-7 17 L-3.5 15.5 L-2 19 L1.5 4 Z" fill={fill} />
      <path d="M1 3 L7 17 L3.5 15.5 L2 19 L-1.5 4 Z" fill={fill} />
      <path d="M0 0 C-5 -9 -17 -11 -17 -1 C-17 8 -6 6 0 0 Z" fill={fill} />
      <path d="M0 0 C5 -9 17 -11 17 -1 C17 8 6 6 0 0 Z" fill={fill} />
      <path d="M-12 -3 C-9 -6 -5 -4 -3 -1" fill="none" stroke={pink ? "#c95b8a" : "#cdb8c3"} strokeWidth={0.8} />
      <path d="M12 -3 C9 -6 5 -4 3 -1" fill="none" stroke={pink ? "#c95b8a" : "#cdb8c3"} strokeWidth={0.8} />
      <rect x={-3.6} y={-3.6} width={7.2} height={7.4} rx={2.6} fill={fill} />
      <ellipse cx={-10} cy={-3} rx={2.4} ry={1.2} fill="#fff" opacity={0.8} stroke="none" />
    </g>
  );
}

function Pearl() {
  return (
    <g>
      <circle r={6.4} fill="url(#nn-pearl)" stroke="#d8c9c0" strokeWidth={0.5} />
      <ellipse cx={-2} cy={-2.4} rx={1.8} ry={1.2} fill="#fff" opacity={0.95} />
    </g>
  );
}

function Star({ silver }: { silver?: boolean }) {
  return (
    <g>
      <path
        d="M0 -11 L3.1 -3.6 L11 -3.4 L4.8 1.6 L7 9.4 L0 4.9 L-7 9.4 L-4.8 1.6 L-11 -3.4 L-3.1 -3.6 Z"
        fill={silver ? "url(#nn-silver)" : "url(#nn-gold)"}
        stroke={silver ? "#8e949b" : "#a8841f"}
        strokeWidth={0.6}
        strokeLinejoin="round"
      />
      <path d="M-1.5 -6 L0 -8.5" stroke="#fff" strokeWidth={1.2} strokeLinecap="round" opacity={0.9} />
    </g>
  );
}

function Moon() {
  return (
    <g>
      <path d="M3 -10 A10.5 10.5 0 1 0 3 10 A8 8 0 1 1 3 -10 Z" fill="url(#nn-gold)" stroke="#a8841f" strokeWidth={0.6} />
      <circle cx={-5} cy={-4} r={1} fill="#fff" opacity={0.85} />
    </g>
  );
}

function Butterfly() {
  return (
    <g stroke="#8f7ac4" strokeWidth={0.6}>
      <path d="M0 0 C-4 -12 -17 -14 -15 -3 C-14 3 -5 3 0 0 Z" fill="url(#nn-butterfly)" />
      <path d="M0 0 C4 -12 17 -14 15 -3 C14 3 5 3 0 0 Z" fill="url(#nn-butterfly)" />
      <path d="M0 1 C-3 5 -11 10 -10 4 C-9 1 -4 1 0 1 Z" fill="url(#nn-butterfly)" />
      <path d="M0 1 C3 5 11 10 10 4 C9 1 4 1 0 1 Z" fill="url(#nn-butterfly)" />
      <ellipse rx={1.2} ry={6} fill="#4b3a70" stroke="none" />
      <circle cx={-8} cy={-6} r={1.6} fill="#fff" opacity={0.75} stroke="none" />
      <circle cx={8} cy={-6} r={1.6} fill="#fff" opacity={0.75} stroke="none" />
    </g>
  );
}

function Daisy() {
  return (
    <g>
      {Array.from({ length: 8 }, (_, i) => (
        <ellipse key={i} cy={-6.2} rx={3} ry={5.8} fill="#fff" stroke="#eadfe4" strokeWidth={0.5}
          transform={`rotate(${i * 45})`} />
      ))}
      <circle r={3.6} fill="url(#nn-daisy)" stroke="#e0a800" strokeWidth={0.5} />
    </g>
  );
}

function Rose() {
  return (
    <g>
      <path d="M-9 6 C-14 4 -13 -3 -8 -5" fill="#8fc49a" stroke="#5f9a6b" strokeWidth={0.6} />
      <circle r={9} fill="url(#nn-rose)" stroke="#b83d63" strokeWidth={0.6} />
      <path d="M-5 1 C-5 -5 5 -5 5 0 C5 4 -2 4 -2 0 C-2 -2 2 -2 2 0" fill="none" stroke="#a02e53" strokeWidth={1}
        strokeLinecap="round" />
      <path d="M-8 3 C-6 8 6 8 8 3" fill="none" stroke="#c24a70" strokeWidth={0.9} />
      <ellipse cx={-4} cy={-5} rx={2} ry={1.1} fill="#fff" opacity={0.5} />
    </g>
  );
}

function Crystal() {
  return (
    <g strokeLinejoin="round">
      <path d="M0 -7 L6 -1.5 L0 7 L-6 -1.5 Z" fill="url(#nn-crystal)" stroke="#b6a9d6" strokeWidth={0.5} />
      <path d="M-6 -1.5 L6 -1.5 M0 -7 L-2 -1.5 L0 7 M0 -7 L2 -1.5 L0 7" stroke="#fff" strokeWidth={0.45} opacity={0.8}
        fill="none" />
      <path d="M-3.4 -4.2 L-2.2 -4.2" stroke="#fff" strokeWidth={1.1} strokeLinecap="round" />
    </g>
  );
}

function Heart() {
  return (
    <g>
      <path d="M0 9 C-11 1 -12 -9 -5 -9.5 C-2 -9.7 -0.4 -7.5 0 -6 C0.4 -7.5 2 -9.7 5 -9.5 C12 -9 11 1 0 9 Z"
        fill="url(#nn-heart)" stroke="#c21f62" strokeWidth={0.6} />
      <ellipse cx={-4.5} cy={-5} rx={2.2} ry={1.3} fill="#fff" opacity={0.75} transform="rotate(-25 -4.5 -5)" />
    </g>
  );
}

function Strawberry() {
  const seeds = [[-4, -1], [0, -3], [4, -1], [-2, 3], [2, 3], [-5, 3.5], [5, 3.5], [0, 7], [-3, 7.5], [3, 7.5]];
  return (
    <g>
      <path d="M0 13 C-9 9 -12 -1 -9 -5 C-6 -8 6 -8 9 -5 C12 -1 9 9 0 13 Z" fill="url(#nn-berry)"
        stroke="#a3122e" strokeWidth={0.6} />
      {seeds.map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx={0.7} ry={1.1} fill="#ffe59a" />
      ))}
      <path d="M0 -6 L-6 -10 L-2.5 -7 L-4 -12 L0 -8 L4 -12 L2.5 -7 L6 -10 Z" fill="#5fae6b" stroke="#3f8a4c"
        strokeWidth={0.5} strokeLinejoin="round" />
      <ellipse cx={-4.5} cy={-2} rx={1.8} ry={3} fill="#fff" opacity={0.35} />
    </g>
  );
}

function Teddy() {
  return (
    <g>
      <circle cx={-7.5} cy={-7.5} r={4.2} fill="url(#nn-teddy)" stroke="#6d4633" strokeWidth={0.5} />
      <circle cx={7.5} cy={-7.5} r={4.2} fill="url(#nn-teddy)" stroke="#6d4633" strokeWidth={0.5} />
      <circle cx={-7.5} cy={-7.5} r={2} fill="#e9c3a8" />
      <circle cx={7.5} cy={-7.5} r={2} fill="#e9c3a8" />
      <circle r={10} fill="url(#nn-teddy)" stroke="#6d4633" strokeWidth={0.6} />
      <ellipse cy={3.4} rx={4.8} ry={3.6} fill="#f1d6c1" />
      <circle cx={-3.6} cy={-1.8} r={1.1} fill="#2a0f1f" />
      <circle cx={3.6} cy={-1.8} r={1.1} fill="#2a0f1f" />
      <ellipse cy={2.3} rx={1.5} ry={1.1} fill="#2a0f1f" />
      <circle cx={-6.5} cy={2.2} r={1.4} fill="#f59bb6" opacity={0.7} />
      <circle cx={6.5} cy={2.2} r={1.4} fill="#f59bb6" opacity={0.7} />
    </g>
  );
}

function Shell() {
  return (
    <g>
      <path d="M0 9 L-11 -2 C-9 -10 9 -10 11 -2 Z" fill="url(#nn-shell)" stroke="#d6a48d" strokeWidth={0.6}
        strokeLinejoin="round" />
      {[-7, -3.5, 0, 3.5, 7].map((x) => (
        <path key={x} d={`M0 8 L${x} -7`} stroke="#e3b7a3" strokeWidth={0.7} />
      ))}
      <path d="M-3 9 L3 9 L2 11 L-2 11 Z" fill="#f2c8b4" />
    </g>
  );
}

export function CharmArt({ kind }: { kind: string }) {
  switch (kind) {
    case "bow":
      return <Bow />;
    case "bow-pink":
      return <Bow pink />;
    case "pearl":
      return <Pearl />;
    case "star-gold":
      return <Star />;
    case "star-silver":
      return <Star silver />;
    case "moon":
      return <Moon />;
    case "butterfly":
      return <Butterfly />;
    case "daisy":
      return <Daisy />;
    case "rose-3d":
      return <Rose />;
    case "crystal":
      return <Crystal />;
    case "heart":
      return <Heart />;
    case "strawberry-3d":
      return <Strawberry />;
    case "teddy-3d":
      return <Teddy />;
    case "shell":
      return <Shell />;
    default:
      return <Crystal />;
  }
}

/** Standalone charm icon (used in pickers, BOM lists, admin). */
export function CharmIcon({ kind, size = 36, className }: { kind: string; size?: number; className?: string }) {
  return (
    <svg viewBox="-16 -16 32 32" width={size} height={size} className={className} aria-hidden>
      <g filter="url(#nn-charm-shadow)">
        <CharmArt kind={kind} />
      </g>
    </svg>
  );
}
