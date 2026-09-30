import type { Metadata } from "next";
import { ClientOnly } from "@/components/ui/ClientOnly";
import { SizeClient } from "./SizeClient";

export const metadata: Metadata = {
  title: "Find my nail size",
  description: "Estimate your press-on nail sizes from a photo with a coin — or measure by hand.",
};

export default function SizePage() {
  return (
    <ClientOnly fallback={<div className="mx-auto h-[70vh] max-w-6xl px-5 pt-12"><div className="skeleton h-full rounded-3xl" /></div>}>
      <SizeClient />
    </ClientOnly>
  );
}
