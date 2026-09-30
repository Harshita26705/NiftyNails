/** Shared SVG gradients/filters for nails and charms. Rendered once per document. */
export function NailDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden focusable="false">
      <defs>
        <radialGradient id="nn-pearl" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor="#f7f0ea" />
          <stop offset="85%" stopColor="#e2d4ca" />
          <stop offset="100%" stopColor="#cdbdb2" />
        </radialGradient>
        <linearGradient id="nn-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff3c4" />
          <stop offset="45%" stopColor="#e6c35a" />
          <stop offset="100%" stopColor="#a8841f" />
        </linearGradient>
        <linearGradient id="nn-silver" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#cfd3d8" />
          <stop offset="100%" stopColor="#8e949b" />
        </linearGradient>
        <linearGradient id="nn-rosegold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff0ea" />
          <stop offset="50%" stopColor="#e7b1a2" />
          <stop offset="100%" stopColor="#b77a6b" />
        </linearGradient>
        <linearGradient id="nn-bow-white" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f1e6ec" />
        </linearGradient>
        <linearGradient id="nn-bow-pink" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffd0e3" />
          <stop offset="100%" stopColor="#f48fb8" />
        </linearGradient>
        <linearGradient id="nn-butterfly" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f6f0ff" />
          <stop offset="55%" stopColor="#c9b8f0" />
          <stop offset="100%" stopColor="#9fc6ef" />
        </linearGradient>
        <radialGradient id="nn-daisy" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#fff2a8" />
          <stop offset="100%" stopColor="#f2b705" />
        </radialGradient>
        <radialGradient id="nn-rose" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#ff9fbd" />
          <stop offset="100%" stopColor="#d6406c" />
        </radialGradient>
        <linearGradient id="nn-crystal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#ecebff" />
          <stop offset="100%" stopColor="#c9c2ee" />
        </linearGradient>
        <radialGradient id="nn-heart" cx="35%" cy="30%">
          <stop offset="0%" stopColor="#ff9cc3" />
          <stop offset="100%" stopColor="#e0218a" />
        </radialGradient>
        <radialGradient id="nn-berry" cx="38%" cy="30%">
          <stop offset="0%" stopColor="#ff6b7f" />
          <stop offset="100%" stopColor="#c8102e" />
        </radialGradient>
        <radialGradient id="nn-teddy" cx="38%" cy="32%">
          <stop offset="0%" stopColor="#c89274" />
          <stop offset="100%" stopColor="#8a5a41" />
        </radialGradient>
        <linearGradient id="nn-shell" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff1ea" />
          <stop offset="100%" stopColor="#f5c7b3" />
        </linearGradient>
        <linearGradient id="nn-gloss" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="nn-gloss-v" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="nn-glaze" cx="38%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="40%" stopColor="#fff4fb" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="nn-iridescent" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffd9ef" stopOpacity="0.45" />
          <stop offset="35%" stopColor="#dfe9ff" stopOpacity="0.35" />
          <stop offset="70%" stopColor="#e3fff3" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#fff2d6" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="nn-depth" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.14" />
          <stop offset="70%" stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#3b0d24" stopOpacity="0.14" />
        </linearGradient>
        <filter id="nn-nail-shadow" x="-30%" y="-20%" width="160%" height="150%">
          <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#4a1030" floodOpacity="0.16" />
        </filter>
        <filter id="nn-charm-shadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="1.2" stdDeviation="1" floodColor="#3b0d24" floodOpacity="0.28" />
        </filter>
        <filter id="nn-soft-blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
      </defs>
    </svg>
  );
}
