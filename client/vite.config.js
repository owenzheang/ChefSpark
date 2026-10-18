import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "ChefSpark",
        short_name: "ChefSpark",
        description: "AI-powered recipe inspiration app",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#eef7ee",
        theme_color: "#4caf50",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "/icons/maskable-icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        globPatterns: ["**/*.{js,css,html,png,svg,webp,ico}"],
        // Development-only reviewed Zine artwork must not enter the offline precache.
        globIgnores: ["**/node_modules/**/*", "zine-assets/**"],
        navigateFallback: "/index.html",
        runtimeCaching: []
      }
    })
  ], 
  server: {
    host: "0.0.0.0"
  },
  preview: {
    host: "0.0.0.0"
  }

});
