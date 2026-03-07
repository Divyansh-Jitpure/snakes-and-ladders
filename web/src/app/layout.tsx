import type { Metadata, Viewport } from "next";
import PwaRegister from "@/components/pwa-register";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Snakes and Ladders Online",
  description:
    "Realtime snakes and ladders starter built with Next.js and Socket.IO",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SnakesLadders",
  },
  icons: {
    icon: [
      { url: "/icon-192x192.svg", type: "image/svg+xml" },
      { url: "/icon-512x512.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icon-192x192.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#f97316",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentYear = new Date().getFullYear();

  return (
    <html lang="en">
      <body className="antialiased">
        <div className="flex min-h-screen flex-col">
          <PwaRegister />
          <Toaster richColors position="top-right" />
          <div className="flex-1">{children}</div>
          <footer className="border-t border-amber-500/20 bg-[linear-gradient(180deg,#120a06_0%,#1c0f09_100%)] px-4 py-5 text-center text-sm text-amber-100/75 sm:px-6">
            © {currentYear} All Rights Reserved —{" "}
            <a
              href="https://github.com/Divyansh-Jitpure"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-amber-100 underline decoration-amber-300/70 underline-offset-4 transition hover:text-amber-50"
            >
              @DivyanshJitpure
            </a>
          </footer>
        </div>
      </body>
    </html>
  );
}
