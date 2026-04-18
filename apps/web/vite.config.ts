import path from "node:path";
import { fileURLToPath } from "node:url";
import { tamaguiPlugin } from "@tamagui/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiTarget = process.env.VITE_API_PROXY_TARGET ?? "http://127.0.0.1:4000";

// https://vite.dev/config/
export default defineConfig({
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === "development"),
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "development")
  },
  resolve: {
    alias: {
      "react-native": "react-native-web"
    }
  },
  plugins: [
    react(),
    tamaguiPlugin({
      config: path.join(__dirname, "src/tamagui.config.ts"),
      components: ["tamagui"],
      disableExtraction: true
    })
  ],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: {
      "/graphql": { target: apiTarget, changeOrigin: true },
      "/health": { target: apiTarget, changeOrigin: true }
    }
  }
});
