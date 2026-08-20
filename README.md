# blues1998.github.io

Personal site of Animesh Singh — software engineer, photographer, and
musician. Live at **[blues1998.github.io](https://blues1998.github.io)**.

It is a static Astro site, but not a document with a background: every
page renders over one persistent WebGL scene. Six destinations map to six
astronomical objects, and navigating between them is a camera move toward
the next one rather than a page load — the same canvas, the same camera,
carried across navigations by Astro's view transitions.

## Highlights

- **A persistent three.js cosmos.** A layered procedural starfield, a
  planetary system, a pulsar, a galaxy and a nebula built as GPU point
  clouds, plus real scanned NASA/JAXA geometry (the Itokawa asteroid, a
  Voyager probe) and NASA-derived planet textures.
- **Scroll as camera movement.** On inner pages, sections are stations
  along an approach: the camera closes and orbits as you read, so reading
  a page is travelling toward its object.
- **An interactive playground.** *Wander* is an endless procedural scenic
  drive — seasons, a day/night cycle, weather that rolls in on its own,
  and a road that never repeats — written entirely procedurally, with no
  model or texture assets.
- **A photography globe.** Shots plotted where they were taken, on a
  spinning globe.

## Running it

```sh
npm install
npm run dev        # localhost:4321
npm run build      # static output to ./dist
npm run preview    # serve the built site
```

Project pages are generated at build time from the GitHub API. That works
unauthenticated, but setting `GITHUB_TOKEN` avoids the 60-requests-per-hour
limit. If the API is unreachable the build degrades — it warns and ships
without the repo-backed projects — rather than failing.

## Built with

[Astro](https://astro.build) · [three.js](https://threejs.org) · React
(for the playground experiments and the photo globe) ·
[globe.gl](https://globe.gl) · deployed to GitHub Pages by the workflow in
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

Architecture notes for anyone (or anything) working on the code live in
[CLAUDE.md](CLAUDE.md).

## Credits

Planet and Sun textures from
[Solar System Scope](https://www.solarsystemscope.com/textures/) (CC BY
4.0). Asteroid and spacecraft models from NASA/JAXA. Nebula photography
from NASA/ESA. Full attribution ships in the site footer and alongside the
assets in `public/`.
