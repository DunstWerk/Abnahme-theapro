import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Base path matches the GitHub Pages project page (repo name).
export default defineConfig({
  base: "/Abnahme-theapro/",
  plugins: [react()],
  build: {
    target: "es2022",
  },
});
