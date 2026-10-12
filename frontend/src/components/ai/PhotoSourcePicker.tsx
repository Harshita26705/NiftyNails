"use client";

import { Camera, Upload } from "lucide-react";
import { useState } from "react";
import { Segmented } from "@/components/ui/bits";
import { LiveCameraCapture } from "./LiveCameraCapture";
import { PhotoDrop } from "./PhotoDrop";

/** Every "upload a photo" flow also offers a live camera capture, toggled the same way everywhere. */
export function PhotoSourcePicker({ preview, onFile, title, hint, liveHint, children }: {
  preview: string | null;
  onFile: (file: File) => void;
  title: string;
  hint?: string;
  liveHint?: string;
  children?: React.ReactNode;
}) {
  const [mode, setMode] = useState<"upload" | "live">("upload");
  return (
    <div className="space-y-3">
      {!preview && (
        <Segmented value={mode} onChange={setMode} options={[
          { value: "upload", label: <><Upload className="size-4" /> Upload photo</> },
          { value: "live", label: <><Camera className="size-4" /> Use camera</> },
        ]} />
      )}
      {mode === "live" && !preview ? (
        <LiveCameraCapture onCapture={onFile} hint={liveHint} />
      ) : (
        <PhotoDrop preview={preview} onFile={onFile} capture title={title} hint={hint}>{children}</PhotoDrop>
      )}
    </div>
  );
}
