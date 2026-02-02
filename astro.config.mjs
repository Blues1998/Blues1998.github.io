import { defineConfig } from 'astro/config';
import react from "@astrojs/react";
export default defineConfig({
  site: 'https://blues1998.github.io',
  base: '/',
  output: 'static',
  integrations: [react()],
});
