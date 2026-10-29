import type { MetadataRoute } from "next";

/**
 * Lets "Add to Home screen" / "Install app" open Referral Copilot as its own app:
 * `standalone` hides the browser's address bar and tabs but keeps the phone's status bar
 * (clock, battery), which `fullscreen` would hide. iPhones also read `appleWebApp` in layout.tsx.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Referral Copilot",
    short_name: "Referral",
    description: "Find the right people, send the right message, keep track of every referral.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Android crops this one to its launcher shape; the mark stays inside the safe circle.
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
