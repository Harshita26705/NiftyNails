import type { Metadata } from "next";
import { GiftClient } from "./GiftClient";

export const metadata: Metadata = { title: "Gift Nifty", description: "Build a nail gift within your budget." };

export default function GiftPage() {
  return <GiftClient />;
}
