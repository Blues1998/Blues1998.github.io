import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://blues1998.github.io",
  base: "/",
  output: "static",

  build: {
    assets: "astro",
  },

  integrations: [
    react(),
    sitemap(),
  ],
});
