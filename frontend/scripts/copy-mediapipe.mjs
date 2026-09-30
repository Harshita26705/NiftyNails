// Self-host MediaPipe's WASM runtime + the hand landmarker model under /public (no runtime CDN dependency).
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const dest = join(root, "public", "mediapipe", "wasm");
mkdirSync(dest, { recursive: true });
for (const f of ["vision_wasm_internal.js", "vision_wasm_internal.wasm", "vision_wasm_nosimd_internal.js", "vision_wasm_nosimd_internal.wasm"]) {
  if (existsSync(join(src, f))) copyFileSync(join(src, f), join(dest, f));
}
const model = join(root, "..", "backend", "models", "hand_landmarker.task");
const modelDest = join(root, "public", "mediapipe", "hand_landmarker.task");
if (existsSync(model)) copyFileSync(model, modelDest);
else console.warn("hand_landmarker.task not found — run the backend model download first (see README).");
console.log("MediaPipe assets ready in public/mediapipe");
