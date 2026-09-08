import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "フリーアドレス予約",
    short_name: "予約アプリ",
    description: "テレワークブース・会議室の予約管理",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f6f8",
    theme_color: "#2563eb",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
