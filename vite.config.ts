import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // tRPC client
      "@/lib/trpc/client": path.resolve(__dirname, "./src/lib/trpc.tsx"),
      // Root alias
      "@": path.resolve(__dirname, "."),
      // Clerk server → noop for browser bundles
      "@clerk/nextjs": "@clerk/react",
      // Next.js module adapters (each file has the correct default/named exports)
      "next/link": path.resolve(__dirname, "./src/lib/next-link.tsx"),
      "next/navigation": path.resolve(__dirname, "./src/lib/next-navigation.tsx"),
      "next/image": path.resolve(__dirname, "./src/lib/next-image.tsx"),
    },
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
