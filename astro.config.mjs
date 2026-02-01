import { defineConfig } from 'astro/config';
import react from "@astrojs/react";
export default defineConfig({
  site: 'https://blues1998.github.io',
  base: '/new/',
  output: 'static',
  integrations: [react()],
});
