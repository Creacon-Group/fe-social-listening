import "@fontsource-variable/archivo/wdth.css";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Social Listening",
  description: "Brand monitoring and competitor analysis from social listening data",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
