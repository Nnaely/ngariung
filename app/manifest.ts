import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ngariung — Absen Nongkrong Polban",
    short_name: "Ngariung",
    description:
      "Absen harian di Pancong, kumpulkan streak, dan bikin temanmu FOMO.",
    start_url: "/?src=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#08080A",
    theme_color: "#08080A",
    lang: "id",
    categories: ["social", "lifestyle"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
