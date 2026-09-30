"use client";

/**
 * In-browser hand landmark detection (MediaPipe Tasks, WASM, self-hosted under /public/mediapipe).
 * The photo never leaves the device for this step; only the 21 landmark points are sent with the upload.
 */
import type { HandLandmarker } from "@mediapipe/tasks-vision";

export type DetectedHand = { points: [number, number][]; handedness: string; score: number };

let landmarker: Promise<HandLandmarker> | null = null;

async function load(): Promise<HandLandmarker> {
  const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
  const fileset = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
  const options = {
    baseOptions: { modelAssetPath: "/mediapipe/hand_landmarker.task", delegate: "CPU" as const },
    runningMode: "IMAGE" as const,
    numHands: 1,
    minHandDetectionConfidence: 0.35,
    minHandPresenceConfidence: 0.35,
  };
  return HandLandmarker.createFromOptions(fileset, options);
}

export async function detectHand(image: HTMLImageElement | ImageBitmap): Promise<DetectedHand | null> {
  landmarker ??= load().catch((e) => {
    landmarker = null;
    throw e;
  });
  const lm = await landmarker;
  const res = lm.detect(image);
  const hand = res.landmarks?.[0];
  if (!hand) return null;
  const cat = res.handedness?.[0]?.[0];
  return {
    points: hand.map((p) => [p.x, p.y] as [number, number]),
    handedness: cat?.categoryName ?? "Unknown",
    score: cat?.score ?? 0.8,
  };
}

/** Warm up the WASM + model while the user reads the instructions. */
export function preloadHandDetector() {
  landmarker ??= load().catch(() => {
    landmarker = null;
    return Promise.reject();
  }) as Promise<HandLandmarker>;
  landmarker.catch(() => undefined);
}
