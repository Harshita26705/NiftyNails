"use client";

/**
 * In-browser hand landmark detection (MediaPipe Tasks, WASM, self-hosted under /public/mediapipe).
 * The photo never leaves the device for this step; only the 21 landmark points are sent with the upload.
 */
import type { HandLandmarker } from "@mediapipe/tasks-vision";

export type DetectedHand = { points: [number, number][]; handedness: string; score: number };

// MediaPipe's WASM/TFLite runtime logs informational lines ("Created TensorFlow Lite XNNPACK delegate…",
// feedback-manager/landmark-projection notices) through console.error/warn, not console.log — harmless, but
// Next's dev overlay treats any console.error as a crash and pops a full-screen "Console Error" dialog.
// Silence just those known-benign lines while calling into MediaPipe; everything else still surfaces normally.
const MEDIAPIPE_NOISE = /XNNPACK delegate|inference_feedback_manager|landmark_projection_calculator|Feedback manager requires|NORM_RECT without IMAGE_DIMENSIONS/;

function quietMediapipeLogs<T>(fn: () => T): T {
  const origError = console.error, origWarn = console.warn;
  const filtered = (orig: typeof console.error) => (...args: unknown[]) => {
    if (typeof args[0] === "string" && MEDIAPIPE_NOISE.test(args[0])) return;
    orig(...args);
  };
  console.error = filtered(origError);
  console.warn = filtered(origWarn);
  try {
    return fn();
  } finally {
    console.error = origError;
    console.warn = origWarn;
  }
}

async function quietMediapipeLogsAsync<T>(fn: () => Promise<T>): Promise<T> {
  const origError = console.error, origWarn = console.warn;
  const filtered = (orig: typeof console.error) => (...args: unknown[]) => {
    if (typeof args[0] === "string" && MEDIAPIPE_NOISE.test(args[0])) return;
    orig(...args);
  };
  console.error = filtered(origError);
  console.warn = filtered(origWarn);
  try {
    return await fn();
  } finally {
    console.error = origError;
    console.warn = origWarn;
  }
}

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
  return quietMediapipeLogsAsync(() => HandLandmarker.createFromOptions(fileset, options));
}

export async function detectHand(image: HTMLImageElement | ImageBitmap): Promise<DetectedHand | null> {
  landmarker ??= load().catch((e) => {
    landmarker = null;
    throw e;
  });
  const lm = await landmarker;
  const res = quietMediapipeLogs(() => lm.detect(image));
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

// ------------------------------------------------------------------ live (video-stream) tracking
// A separate landmarker instance: MediaPipe's Tasks API ties `runningMode` to the instance at creation,
// so the single-photo (IMAGE) detector above can't be reused for a live camera feed (VIDEO).

export type DetectedHands = { hand: DetectedHand; landmarks: { x: number; y: number; z: number }[] }[];

let liveLandmarker: Promise<HandLandmarker> | null = null;

async function loadLive(): Promise<HandLandmarker> {
  const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
  const fileset = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
  return quietMediapipeLogsAsync(() =>
    HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: "/mediapipe/hand_landmarker.task", delegate: "GPU" },
      runningMode: "VIDEO",
      numHands: 2,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    }).catch(() =>
      // Some devices/browsers lack a WebGL-capable delegate; retry on CPU.
      HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: "/mediapipe/hand_landmarker.task", delegate: "CPU" },
        runningMode: "VIDEO",
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      }),
    ),
  );
}

/** Loads (once) and returns the live video-mode hand landmarker. */
export async function getLiveHandLandmarker(): Promise<HandLandmarker> {
  liveLandmarker ??= loadLive().catch((e) => {
    liveLandmarker = null;
    throw e;
  });
  return liveLandmarker;
}

/** One frame of a live video's hands, each with 21 normalised (0–1) landmarks + which hand it is. */
export function detectHandsForVideo(lm: HandLandmarker, video: HTMLVideoElement, timestampMs: number): DetectedHands {
  const res = quietMediapipeLogs(() => lm.detectForVideo(video, timestampMs));
  return (res.landmarks ?? []).map((points, i) => {
    const cat = res.handedness?.[i]?.[0];
    return {
      hand: { points: points.map((p) => [p.x, p.y] as [number, number]), handedness: cat?.categoryName ?? "Unknown", score: cat?.score ?? 0.8 },
      landmarks: points,
    };
  });
}
