import "@fontsource-variable/plus-jakarta-sans";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Social Listening",
  description: "Social listening & brand intelligence dashboard",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
