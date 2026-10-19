import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "LittleApple Start",
    short_name: "LittleApple",
    description: "LittleApple Start Community Edition",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#eaf4ff",
    theme_color: "#eaf4ff",
    icons: [
      { src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
