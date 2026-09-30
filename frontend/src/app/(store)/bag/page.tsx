import type { Metadata } from "next";
import { BagClient } from "./BagClient";

export const metadata: Metadata = { title: "Your bag" };

export default function BagPage() {
  return <BagClient />;
}
