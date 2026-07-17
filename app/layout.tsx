import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Inter — the typeface of choice for fintech / high-end utility apps. Self-hosted
// by next/font (no external request, no layout shift). We pull it in as a CSS
// variable so Tailwind's font-sans and our own rules can both reference it.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Vices.ai",
  description: "Track healthy habits, earn points, and spend them on your vices.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Vices",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0E1013",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
