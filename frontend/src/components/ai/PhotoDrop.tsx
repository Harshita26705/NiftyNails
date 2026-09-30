"use client";

import { Camera, ImagePlus, RefreshCw } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/format";

/** Large, touch-friendly photo picker: camera on phones, file picker/drag-and-drop on desktop. */
export function PhotoDrop({ preview, onFile, title, hint, capture, className, children }: {
  preview: string | null;
  onFile: (file: File) => void;
  title: string;
  hint?: string;
  capture?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      className={cn(
        "relative overflow-hidden rounded-[1.8rem] border-2 border-dashed transition",
        drag ? "border-pink bg-blush-100" : "border-line-strong bg-surface",
        preview && "border-solid border-transparent",
        className,
      )}
    >
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
        {...(capture ? { capture: "environment" as const } : {})}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} aria-label={title} />
      {preview ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Your upload" className="max-h-[420px] w-full rounded-[1.6rem] object-contain" />
          {children}
          <button type="button" onClick={() => input.current?.click()}
            className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3.5 py-2 text-[13px] font-semibold shadow backdrop-blur">
            <RefreshCw className="size-4" /> Change photo
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => input.current?.click()} className="flex w-full flex-col items-center px-6 py-12 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-blush-100 text-pink">
            {capture ? <Camera className="size-7" /> : <ImagePlus className="size-7" />}
          </span>
          <span className="mt-4 text-[16px] font-semibold">{title}</span>
          {hint && <span className="mt-1.5 max-w-xs text-[13px] leading-relaxed text-ink-2">{hint}</span>}
          <span className="mt-5 rounded-full bg-ink px-5 py-2.5 text-[13px] font-semibold text-white">Choose photo</span>
        </button>
      )}
    </div>
  );
}
