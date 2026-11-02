import type { Metadata, Viewport } from "next";
import { Outfit, Space_Grotesk } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });
const space = Space_Grotesk({ subsets: ["latin"], variable: "--font-space", weight: ["400", "500", "700"], display: "swap" });

export const metadata: Metadata = {
  title: "Social Listening",
  description: "Brand monitoring and competitor analysis from social listening data",
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f0" },
    { media: "(prefers-color-scheme: dark)", color: "#111113" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${outfit.variable} ${space.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
