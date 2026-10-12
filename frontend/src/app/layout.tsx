import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import { NailDefs } from "@/components/nails/NailDefs";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const jost = Jost({
  subsets: ["latin"],
  variable: "--font-jost",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Nifty Nails — Handmade press-on nails, designed with you",
    template: "%s · Nifty Nails",
  },
  description:
    "Premium handmade press-on nails. Shop designs, create your own with our AI nail stylist, and find your perfect fit with photo sizing.",
  applicationName: "Nifty Nails",
};

export const viewport: Viewport = {
  themeColor: "#fcf5eb",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" className={`${cormorant.variable} ${jost.variable}`}>
      <body className="min-h-dvh">
        <NailDefs />
        {children}
      </body>
    </html>
  );
}
