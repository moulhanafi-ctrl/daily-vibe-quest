// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { componentTagger } from "lovable-tagger";
import { sentryVitePlugin } from "@sentry/vite-plugin";

// ESM-safe path helpers (avoid __dirname errors in Publish builds)
import { fileURLToPath } from "node:url";
const aliasSrc = fileURLToPath(new URL("./src", import.meta.url));

// Only run Sentry if all env vars exist (prevents Publish failure)
const hasSentry =
  !!(process.env.SENTRY_ORG &&
     process.env.SENTRY_PROJECT &&
     process.env.SENTRY_AUTH_TOKEN);

export default defineConfig(({ mode }) => ({
  server: { host: "::", port: 8080 },

  plugins: [
    react(),
    mode === "development" && componentTagger(),
    mode === "production" && hasSentry && sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      sourcemaps: { assets: "./dist/**" },
      telemetry: false,
    }),
  ].filter(Boolean),

  build: {
    target: "es2020",
    cssCodeSplit: true,
    rollupOptions: {
      external: [], // <-- keep React bundled
      output: {
        manualChunks: (id: string) => {
          if (id.includes("node_modules")) {
            if (id.includes("react") || id.includes("react-dom") || id.includes("react-router")) return "react-vendor";
            if (id.includes("@supabase")) return "supabase";
            if (id.includes("@radix-ui")) return "ui-radix";
            if (id.includes("lucide-react")) return "icons";
            if (id.includes("recharts") || id.includes("framer-motion")) return "charts-animations";
            return "vendor";
          }
        },
        assetFileNames: (assetInfo: { name?: string }) => {
          if (!assetInfo.name) return `assets/[name]-[hash][extname]`;
          const ext = assetInfo.name.split(".").pop() || "";
          if (/png|jpe?g|svg|gif|tiff|bmp|ico|webp/i.test(ext)) return `assets/images/[name]-[hash][extname]`;
          if (/woff2?|eot|ttf|otf/i.test(ext)) return `assets/fonts/[name]-[hash][extname]`;
          return `assets/[name]-[hash][extname]`;
        },
        chunkFileNames: "assets/js/[name]-[hash].js",
        entryFileNames: "assets/js/[name]-[hash].js",
      },
    },
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: mode === "production",
        drop_debugger: mode === "production",
        pure_funcs: mode === "production" ? ["console.log", "console.info"] : [],
        passes: 2,
      },
      mangle: { safari10: true },
    },
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1000,
    commonjsOptions: { include: [/node_modules/], transformMixedEsModules: true },
  },

  optimizeDeps: {
    include: ["react", "react-dom", "@supabase/supabase-js"],
    esbuildOptions: { target: "es2020" },
  },

  resolve: {
    alias: {
      "@": aliasSrc, // ESM-safe alias to ./src
    },
    dedupe: ["react", "react-dom"],
  },
}));
