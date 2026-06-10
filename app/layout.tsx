import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vices AI",
  description: "Earn your vices. Balance your sins.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="scanline-overlay" />
        {children}
      </body>
    </html>
  );
}
