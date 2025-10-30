// vite.config.ts (minimal)
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { fileURLToPath } from "node:url";

// ESM-safe alias to ./src (no __dirname)
const aliasSrc = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  server: { host: "::", port: 8080 },
  plugins: [react()],
  resolve: {
    alias: { "@": aliasSrc },
    dedupe: ["react", "react-dom"]
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    rollupOptions: {
      external: [] // ensure React/DOM are bundled
    },
    minify: "terser",
    reportCompressedSize: false
  },
  optimizeDeps: {
    include: ["react", "react-dom", "@supabase/supabase-js"],
    esbuildOptions: { target: "es2020" }
  }
});
