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
    sitemap({
      // The terminal is an unlinked easter egg (press ~) and already
      // carries <meta name="robots" content="noindex">. Listing it in the
      // sitemap told crawlers to index the very page the page itself asks
      // them not to - a contradiction that wastes crawl budget and can be
      // reported as a coverage error in Search Console.
      filter: (page) => !/\/terminal\/?$/.test(new URL(page).pathname),
    }),
  ],
});
