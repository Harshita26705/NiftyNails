import type { Metadata } from "next";
import { Suspense } from "react";
import { DrawStudio } from "@/components/editor/DrawStudio";

export const metadata: Metadata = { title: "Draw your own nails" };

export default function DrawPage() {
  return (
    <Suspense>
      <DrawStudio />
    </Suspense>
  );
}
