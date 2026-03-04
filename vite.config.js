import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  base: "/addin-cel-dashboard/",
  root: "src",
  publicDir: "public",
  build: {
    outDir: "../docs",
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, "src/cel.html"),
    },
  },
});
