import Image from "next/image";

const RING_TEXT = "HANDMADE · MADE TO ORDER · SIZES 0–9 · NIFTY NAILS · ".repeat(2);

/** Hibiscus petals and olive leaves that drift down past the emblem. `dx`/`delay` de-synchronise them. */
const PETALS = [
  { left: 6, dur: 15, delay: -2, size: 30, fill: "#F6C9A8", leaf: false },
  { left: 24, dur: 18, delay: -9, size: 26, fill: "#EBA98A", leaf: false },
  { left: 42, dur: 13, delay: -5, size: 34, fill: "#F2D9A6", leaf: false },
  { left: 60, dur: 20, delay: -13, size: 26, fill: "#7A8450", leaf: true },
  { left: 76, dur: 16, delay: -7, size: 32, fill: "#F6C9A8", leaf: false },
  { left: 92, dur: 19, delay: -16, size: 24, fill: "#EBA98A", leaf: false },
] as const;

/**
 * The brand emblem, animated: a slowly turning ring of text, breathing gold rings, an orbiting bead and drifting
 * petals. Purely decorative motion (all of it is disabled under prefers-reduced-motion by the global rule).
 * Size it with a width on `className`; it stays square.
 */
export function Emblem({ className = "" }: { className?: string }) {
  return (
    <div className={`relative aspect-square ${className}`}>
      {/* dashed outer ring, turns the other way */}
      <div aria-hidden className="absolute inset-[3.5%] animate-turn-rev rounded-full border border-dashed border-blush-300" />
      {/* breathing gold ring */}
      <div aria-hidden className="absolute inset-[7%] animate-breathe rounded-full border border-gold" />
      {/* rotating text ring */}
      <svg aria-hidden viewBox="0 0 200 200" className="absolute inset-0 size-full animate-turn">
        <defs>
          <path id="emblem-ring" d="M100 100 m-89 0 a89 89 0 1 1 178 0 a89 89 0 1 1 -178 0" />
        </defs>
        <text fontSize="6.4" fontWeight="500" fill="var(--color-pink)" style={{ fontFamily: "var(--font-jost), sans-serif" }}>
          <textPath href="#emblem-ring" textLength="556" lengthAdjust="spacing">{RING_TEXT}</textPath>
        </text>
      </svg>
      {/* orbiting bead */}
      <div aria-hidden className="absolute inset-[7%] animate-orbit">
        <span className="absolute top-[-5px] left-1/2 -ml-[5px] size-2.5 rounded-full bg-gold shadow-[0_0_0_4px_rgb(160_106_32/0.2)]" />
      </div>
      {/* the emblem itself */}
      <div className="absolute inset-[12.1%] overflow-hidden rounded-full shadow-[0_40px_60px_-36px_rgb(46_26_16/0.55)]">
        <Image src="/logo.png" alt="Nifty Nails emblem: a woman with hibiscus flowers over her face and black floral nails"
          fill priority sizes="(min-width: 768px) 440px, 214px" className="object-cover" />
      </div>
      {/* drifting petals */}
      <div aria-hidden className="pointer-events-none absolute -inset-x-[8%] -inset-y-[10%] [--fall:300px] md:[--fall:720px]">
        {PETALS.map((p, i) => (
          <svg key={i} viewBox="0 0 26 34" width={p.size} height={Math.round((p.size * 34) / 26)}
            className="absolute top-0 animate-petal will-change-transform"
            style={{ left: `${p.left}%`, animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s` }}>
            {p.leaf ? (
              <>
                <path d="M4 30 C2 14 10 4 24 2 C26 16 18 28 4 30Z" fill={p.fill} />
                <path d="M6 28 C12 18 18 10 23 4" stroke="#ffffff55" strokeWidth=".8" fill="none" />
              </>
            ) : (
              <>
                <path d="M12 2 C21 9 21 21 12 32 C3 21 3 9 12 2Z" fill={p.fill} />
                <path d="M12 6 C13 14 13 22 12 29" stroke="#ffffff88" strokeWidth=".8" fill="none" />
              </>
            )}
          </svg>
        ))}
      </div>
    </div>
  );
}
