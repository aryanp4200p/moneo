import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),

    VitePWA({
      registerType: "autoUpdate",

      manifest: {
        name: "Moneo — Personal Finance",
        short_name: "Moneo",
        description:
          "Moneo helps you track expenses, plan budgets, and gain AI-powered financial insights.",
        theme_color: "#7957E8",
        background_color: "#F5F6FC",
        display: "standalone",
        start_url: "/",
        scope: "/",

        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },

      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallbackDenylist: [/^\/api/],
      },

      devOptions: {
        enabled: true,
      },
    }),
  ],

  server: {
    port: 5173,
  },
});
