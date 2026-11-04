import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { ServiceWorker } from "@/components/ServiceWorker";

export const metadata: Metadata = {
  title: "Ngariung — Absen dulu, baru nongkrong",
  description:
    "Platform absen & streak nongkrong mahasiswa Polban. Khusus email @polban.ac.id.",
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
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body className="antialiased">
        <StoreProvider>
          <div className="mx-auto min-h-dvh w-full max-w-[440px]">{children}</div>
        </StoreProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
