import { defineConfig, sharpImageService } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://blues1998.github.io",
  base: "/",
  output: "static",

  image: {
    service: sharpImageService(),
  },

  build: {
    assets: "astro",
  },

  integrations: [
    react(),
    sitemap(),
  ],
});
