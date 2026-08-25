import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Base path matches the GitHub Pages project page (repo name).
export default defineConfig({
  base: "/Abnahme-theapro/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false, // manuelle Registrierung in src/main.tsx
      devOptions: { enabled: false }, // kein Service Worker unter `vite dev`
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*.{js,css,html,woff,woff2,ttf,png}"],
      },
      manifest: {
        name: "VOB-Abnahme Helfer",
        short_name: "VOB-Abnahme",
        description:
          "Kleiner Helfer für die strukturierte VOB-Abnahme (§ 12 VOB/B): Checkliste, Mängelliste, PDF-Export.",
        lang: "de",
        theme_color: "#ed6950",
        background_color: "#ffffff",
        display: "standalone",
        icons: [
          { src: "icons/pwa-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icons/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icons/maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
  build: {
    target: "es2022",
  },
});
