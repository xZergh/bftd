import path from "node:path";
import { fileURLToPath } from "node:url";
import { tamaguiPlugin } from "@tamagui/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    tamaguiPlugin({
      config: path.join(__dirname, "src/tamagui.config.ts"),
      components: ["tamagui"],
      disableExtraction: true
    })
  ],
  resolve: {
    alias: {
      "react-native": "react-native-web"
    }
  },
  define: {
    __DEV__: JSON.stringify(true),
    "process.env.NODE_ENV": JSON.stringify("test")
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"]
  }
});
