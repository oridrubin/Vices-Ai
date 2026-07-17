import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vices.ai",
    short_name: "Vices",
    description: "Track healthy habits, earn points, and spend them on your vices.",
    start_url: "/",
    display: "standalone",
    background_color: "#0E1013",
    theme_color: "#0E1013",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
