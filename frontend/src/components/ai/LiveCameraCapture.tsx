"use client";

import { AlertTriangle, Camera as CameraIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Spinner } from "@/components/ui/Spinner";

/** A live camera viewfinder with a shutter button that hands back a captured frame as a File — the live
 * counterpart to picking/uploading a photo, for anything that otherwise takes a `File`. */
export function LiveCameraCapture({ onCapture, hint }: { onCapture: (file: File) => void; hint?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let stopped = false;
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1600 } }, audio: false,
        });
        if (stopped) { s.getTracks().forEach((t) => t.stop()); return; }
        stream = s;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = s;
        await video.play();
        if (!stopped) setReady(true);
      } catch {
        if (!stopped) setError("Couldn't access your camera. Check your browser's camera permission, or upload a photo instead.");
      }
    })();
    return () => { stopped = true; stream?.getTracks().forEach((t) => t.stop()); };
  }, []);

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => { if (blob) onCapture(new File([blob], "capture.jpg", { type: "image/jpeg" })); }, "image/jpeg", 0.92);
  };

  return (
    <div className="relative overflow-hidden rounded-[0.75rem] bg-black ring-1 ring-line">
      <video ref={videoRef} muted playsInline className="aspect-[4/3] w-full object-cover" />
      {!ready && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
          <Spinner className="size-6" />
          <p className="text-[12.5px]">Starting your camera…</p>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center text-white">
          <AlertTriangle className="size-6 text-danger" />
          <p className="text-[12.5px]">{error}</p>
        </div>
      )}
      {ready && (
        <>
          {hint && (
            <p className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1.5 text-[12px] font-semibold text-ink shadow backdrop-blur">
              {hint}
            </p>
          )}
          <button type="button" onClick={capture} aria-label="Capture photo"
            className="absolute bottom-4 left-1/2 flex size-16 -translate-x-1/2 items-center justify-center rounded-full bg-white/95 shadow-lg ring-4 ring-white/40 active:scale-95">
            <CameraIcon className="size-6 text-ink" />
          </button>
        </>
      )}
    </div>
  );
}
