import { defineConfig, sharpImageService } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";

/* Astro's dev server does not serve directory indexes out of public/, so a
 * prebuilt app living at public/apps/<name>/index.html answers on its clean
 * URL in the real build and on GitHub Pages, but 404s under `npm run dev`.
 *
 * That asymmetry is only ever a trap: the link is correct everywhere it
 * ships and broken on the one machine anyone checks it from, which reads
 * as "the link is dead" right up until it goes live. The alternative was
 * linking /apps/<name>/index.html everywhere, which is a worse URL in the
 * address bar forever to work around a dev-only quirk.
 *
 * apply: "serve" keeps this out of the build entirely.
 */
function publicDirIndexes() {
  return {
    name: "public-dir-indexes",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const [path, query] = (req.url ?? "").split("?");
        if (path.startsWith("/apps/") && path.endsWith("/")) {
          req.url = `${path}index.html${query ? `?${query}` : ""}`;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  site: "https://blues1998.github.io",
  base: "/",
  output: "static",

  image: {
    service: sharpImageService(),
  },

  vite: {
    plugins: [publicDirIndexes()],
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
