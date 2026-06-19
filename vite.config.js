import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    // HMR needs the actual external hostname when behind a reverse proxy
    hmr: {
      clientPort: 443,
      protocol: "wss",
    },
    // Allow all hosts (the preview URL forwards through ingress)
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://localhost:8001",
        changeOrigin: true,
      },
    },
  },
});
