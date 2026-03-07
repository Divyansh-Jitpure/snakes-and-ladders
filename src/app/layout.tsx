import type { Metadata, Viewport } from "next";
import PwaRegister from "@/components/pwa-register";
import "./globals.css";

export const metadata: Metadata = {
  title: "Snakes and Ladders Online",
  description: "Realtime snakes and ladders starter built with Next.js and Socket.IO",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SnakesLadders"
  },
  icons: {
    icon: [
      { url: "/icon-192x192.svg", type: "image/svg+xml" },
      { url: "/icon-512x512.svg", type: "image/svg+xml" }
    ],
    apple: [{ url: "/icon-192x192.svg", type: "image/svg+xml" }]
  }
};

export const viewport: Viewport = {
  themeColor: "#f97316"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
