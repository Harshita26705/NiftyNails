"use client";

import { AlertTriangle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NailGroup } from "@/components/nails/Nail";
import { FINGER_SCALE, NAIL_WIDTH } from "@/components/nails/shapes";
import { detectHandsForVideo, getLiveHandLandmarker, type DetectedHands } from "@/lib/handDetect";
import type { CatalogOptions, NailKey } from "@/lib/types";
import { Spinner } from "@/components/ui/Spinner";
import { FINGER_NAME, nailSpec, type Studio } from "./studioModel";

// MediaPipe's 21 hand landmarks: [tip, second joint] per finger, in NailKey finger-number order (1=thumb…5=pinky).
const FINGER_LANDMARKS: { finger: "1" | "2" | "3" | "4" | "5"; tip: number; joint: number }[] = [
  { finger: "1", tip: 4, joint: 3 },
  { finger: "2", tip: 8, joint: 7 },
  { finger: "3", tip: 12, joint: 11 },
  { finger: "4", tip: 16, joint: 15 },
  { finger: "5", tip: 20, joint: 19 },
];
const WRIST = 0, MIDDLE_MCP = 9;

// A fingertip's own last-segment length swings wildly with foreshortening (e.g. a thumb pointed at the
// camera), so nail WIDTH is instead scaled off the wrist→middle-knuckle span — stable across hand pose —
// times each finger's relative width (empirical fraction of that span for a natural-looking fit).
const NAIL_WIDTH_RATIO = 0.145;
// Where the real cuticle sits, in local nail units back from the free edge (y=0) — a fixed distance
// (roughly a natural nail's own width) independent of the *chosen product length* (`h`, which varies with
// short/medium/long/xlong): picking a longer nail should only grow how far the free edge overhangs past
// the real fingertip, not drag the whole nail further back over the skin past the actual cuticle.
// Anchored directly to the TIP landmark (the point MediaPipe locates most reliably), not interpolated
// along the joint→tip segment: that segment collapses under foreshortening (e.g. curled fingers).
const NATURAL_BED_UNITS = NAIL_WIDTH * 0.8;
// Below this on-screen pixel length, the joint→tip vector is too foreshortened to trust for rotation
// (near-zero segment when a finger points straight at the camera) — hold the last good angle instead.
const MIN_DIRECTION_PX = 3;
// Lower = steadier but laggier; higher = snappier but more jittery.
const SMOOTHING = 0.45;

type NailTransform = { x: number; y: number; angle: number; scale: number };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpAngle = (a: number, b: number, t: number) => {
  const d = ((b - a + 540) % 360) - 180;
  return a + d * t;
};

function videoRect(video: HTMLVideoElement, containerW: number, containerH: number) {
  const vw = video.videoWidth || 1, vh = video.videoHeight || 1;
  const scale = Math.min(containerW / vw, containerH / vh);
  const w = vw * scale, h = vh * scale;
  return { x: (containerW - w) / 2, y: (containerH - h) / 2, w, h };
}

/** Live webcam nail try-on: tracks both hands and overlays the current design on every finger in real time. */
export function LiveTryOn({ studio, catalog, onClose }: { studio: Studio; catalog: CatalogOptions; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nailRefs = useRef<Partial<Record<NailKey, SVGGElement | null>>>({});
  const smoothed = useRef<Partial<Record<NailKey, NailTransform>>>({});
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | null = null;
    let raf = 0;

    (async () => {
      try {
        const [lm, s] = await Promise.all([
          getLiveHandLandmarker(),
          navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }),
        ]);
        if (stopped) { s.getTracks().forEach((t) => t.stop()); return; }
        stream = s;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        if (stopped) return;
        setReady(true);

        const paint = (hands: DetectedHands) => {
          const container = containerRef.current;
          if (!container) return;
          const visible = new Set<NailKey>();
          const rect = videoRect(video, container.clientWidth, container.clientHeight);
          for (const { hand, landmarks } of hands) {
            if (hand.score < 0.5) continue;
            const wrist = landmarks[WRIST], midMcp = landmarks[MIDDLE_MCP];
            if (!wrist || !midMcp) continue;
            const wx = rect.x + wrist.x * rect.w, wy = rect.y + wrist.y * rect.h;
            const mx = rect.x + midMcp.x * rect.w, my = rect.y + midMcp.y * rect.h;
            const handScale = Math.hypot(mx - wx, my - wy);
            const prefix = hand.handedness === "Left" ? "L" : "R";

            for (const { finger, tip, joint } of FINGER_LANDMARKS) {
              const tipPt = landmarks[tip], jointPt = landmarks[joint];
              if (!tipPt || !jointPt) continue;
              const tx = rect.x + tipPt.x * rect.w, ty = rect.y + tipPt.y * rect.h;
              const jx = rect.x + jointPt.x * rect.w, jy = rect.y + jointPt.y * rect.h;
              const fingerScale = FINGER_SCALE[FINGER_NAME[finger].toLowerCase() as keyof typeof FINGER_SCALE] ?? 1;
              const key = `${prefix}${finger}` as NailKey;
              const prev = smoothed.current[key];
              const dirLen = Math.hypot(tx - jx, ty - jy);
              const angle = dirLen < MIN_DIRECTION_PX && prev
                ? prev.angle
                : (Math.atan2(ty - jy, tx - jx) * 180) / Math.PI + 90;
              // Anchored directly at the TIP landmark — see TIP_OVERHANG above for why.
              const target: NailTransform = { x: tx, y: ty, angle, scale: (handScale * NAIL_WIDTH_RATIO * fingerScale) / 100 };
              const next: NailTransform = prev
                ? { x: lerp(prev.x, target.x, SMOOTHING), y: lerp(prev.y, target.y, SMOOTHING), angle: lerpAngle(prev.angle, target.angle, SMOOTHING), scale: lerp(prev.scale, target.scale, SMOOTHING) }
                : target;
              smoothed.current[key] = next;
              const g = nailRefs.current[key];
              if (!g) continue;
              g.setAttribute("transform", `translate(${next.x} ${next.y}) rotate(${next.angle}) scale(${next.scale}) translate(-50 ${-NATURAL_BED_UNITS})`);
              g.setAttribute("opacity", "1");
              visible.add(key);
            }
          }
          for (const key of Object.keys(nailRefs.current) as NailKey[]) {
            if (!visible.has(key)) {
              nailRefs.current[key]?.setAttribute("opacity", "0");
              delete smoothed.current[key];
            }
          }
        };

        const loop = () => {
          if (stopped) return;
          if (video.readyState >= 2) paint(detectHandsForVideo(lm, video, performance.now()));
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      } catch {
        if (!stopped) setError("Couldn't access your camera. Check your browser's camera permission and try again.");
      }
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nailKeys: NailKey[] = ["L1", "L2", "L3", "L4", "L5", "R1", "R2", "R3", "R4", "R5"];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div ref={containerRef} className="relative min-h-0 flex-1 overflow-hidden">
        <video ref={videoRef} muted playsInline className="absolute inset-0 size-full object-contain" style={{ transform: "scaleX(-1)" }} />
        <svg className="pointer-events-none absolute inset-0 size-full" style={{ transform: "scaleX(-1)" }} aria-hidden>
          {nailKeys.map((key) => (
            <g key={key} ref={(el) => { nailRefs.current[key] = el; }} opacity={0}>
              <NailGroup spec={nailSpec(studio, key, catalog)} />
            </g>
          ))}
        </svg>
        {!ready && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
            <Spinner className="size-8" />
            <p className="text-[13.5px]">Starting your camera…</p>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center text-white">
            <AlertTriangle className="size-8 text-danger" />
            <p className="text-[13.5px]">{error}</p>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 bg-black/90 px-4 py-3">
        <p className="text-[12.5px] text-white/70">Hold your hand(s) up to the camera to see your design live.</p>
        <button type="button" onClick={onClose} aria-label="Close try-on"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
          <X className="size-5" />
        </button>
      </div>
    </div>
  );
}
