import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  build: { outDir: "e2e-dist" },
  resolve: {
    alias: {
      "@clerk/react": fileURLToPath(
        new URL("./clerk.fixture.jsx", import.meta.url),
      ),
    },
  },
  define: {
    "import.meta.env.VITE_API_URL": JSON.stringify("http://127.0.0.1:5059"),
  },
  server: { host: "127.0.0.1", port: 5188, strictPort: true },
});
