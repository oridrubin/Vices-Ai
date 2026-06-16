import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vices.ai",
  description: "Track healthy habits, earn points, and spend them on your vices.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
