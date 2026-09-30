import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import { NailDefs } from "@/components/nails/NailDefs";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["SOFT", "opsz"],
  variable: "--font-fraunces",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
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
  themeColor: "#faf6ef",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" className={`${fraunces.variable} ${jakarta.variable}`}>
      <body className="min-h-dvh">
        <NailDefs />
        {children}
      </body>
    </html>
  );
}
