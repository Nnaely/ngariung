import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { ServiceWorker } from "@/components/ServiceWorker";
import { AppShell } from "@/components/AppShell";
import { MotionProvider } from "@/components/MotionPreferences";

export const metadata: Metadata = {
  title: "Ngariung — Absen dulu, baru nongkrong",
  description:
    "Platform absen & streak nongkrong. Khusus email @ikamasu.ac.id.",
  manifest: "/manifest.webmanifest",
  applicationName: "Ngariung",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ngariung",
  },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#08080A",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body className="antialiased">
        <StoreProvider>
          <MotionProvider>
            <AppShell>{children}</AppShell>
          </MotionProvider>
        </StoreProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
