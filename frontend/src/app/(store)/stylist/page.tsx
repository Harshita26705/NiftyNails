import type { Metadata } from "next";
import { Suspense } from "react";
import { StylistClient } from "./StylistClient";

export const metadata: Metadata = {
  title: "AI Nail Stylist",
  description: "Describe your dream nails or upload your outfit — we'll match designs we actually make.",
};

export default function StylistPage() {
  return (
    <Suspense>
      <StylistClient />
    </Suspense>
  );
}
