# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

No specific target audience. This is a personal portfolio/microsite, visitors may be recruiters, peers, collaborators, friends, or strangers who followed a link, but the site is not designed around any one of them. Confirmed with the owner: success is not defined by converting a particular visitor type.

## Product Purpose

A personal site for Animesh Singh, software engineer, photographer, and musician, presenting engineering projects, photography, music, and browser experiments ("Playground"). Confirmed with the owner: there is no funnel or single desired action. Projects, Photography, Music, and Playground are equally valid destinations; the goal is an engaging, well-crafted personal presence, not lead generation or a hiring pitch.

## Positioning

Not a company or product, a personal site distinguished by:
- Treating engineering, photography, and music as three equally serious disciplines rather than a resume with hobbies bolted on.
- Live GitHub-sourced project data (no hand-maintained project copy to go stale).
- A deliberately separate "Playground" microsite of interactive/generative browser experiments (Three.js scenes, procedural driving demo, an egg-hatching WebGL hero) that most portfolios don't attempt.

## Operating Context

- Static Astro 5 site (`output: "static"`), deployed to GitHub Pages (`blues1998.github.io`) via a GitHub Actions workflow (`.github/workflows/deploy.yml`).
- **Projects**: generated at build time from the GitHub REST API (`src/lib/github.ts`), public, non-fork, non-archived repos for user `Blues1998`, sorted by stars then recency. Each project page renders the repo's live README (via `marked`), rewriting relative image links to `raw.githubusercontent.com`. Requires a `GITHUB_TOKEN` env var for local builds (rate limits).
- **Photography**: local images in `src/assets/photography/` + `metadata.json` (title, location, lat/lng, date, camera, settings), rendered as an optimized grid (`getImage`, WebP, two sizes) with a custom lightbox/viewer, and as an interactive 3D globe (`globe.gl` + Three.js) with location pins at `/photography/map`.
- **Music**: static list of local audio/video files (`/audio/track-*.mp3`, `/video/session-01.mp4`) played via native `<audio>`/`<video>`, no streaming service integration.
- **Playground**: a separate layout (`PlaygroundLayout.astro`, `playground.css`) hosting interactive React/Three.js experiments (e.g. `endless-drive`), reached from a WebGL hero (egg-hatching animation) and a snaking gallery of experiment cards.
- Hidden Easter egg: pressing `~` anywhere navigates to `/terminal`, a scripted fake-terminal animation (`noindex`).
- Theme: light/dark toggle persisted to `localStorage`, applied pre-paint via an inline script to avoid FOUC.

## Capabilities and Constraints

- Fully static output, no backend, no CMS, no database. Content changes require code/data edits (photography metadata, playground panel list, music track list) or pushing new GitHub repos.
- React is used selectively as islands (`client:load` / `client:only`) inside an otherwise static-first Astro site, globe, playground hero/gallery, endless-drive experiment.
- Image optimization via `@astrojs/react` + Sharp (`sharpImageService`).
- Undecided / open: whether `/audio/` and `/video/` assets referenced by the Music page actually exist in `public/` (not found during this review, treat as a gap, not a fabricated asset).

## Brand Commitments

- Name: Animesh Singh. Tagline: "Engineer. Photographer. Musician."
- Contact channels: email, GitHub (`github.com/Blues1998`), LinkedIn (`linkedin.com/in/animesh-singh-profile`).
- Stated current focus (About page): "Currently exploring: Agentic AI."
- Confirmed with the owner: **Playground is deliberately a separate visual world/brand** from the main site, its own tone, pacing, and visual language are intentional, not a gap to unify.

## Evidence on Hand

- Real GitHub repositories, fetched live, no fabricated project descriptions.
- Real photography set: 6 photos with metadata in `src/assets/photography/`.
- Music/video file paths are referenced in code but were not confirmed present in `public/`, do not assume they play; verify before treating the Music page as fully functional.

## Product Principles

1. Craft and restraint over self-promotion, the main site (Header/Footer/BaseLayout) stays calm and editorial; expressive/experimental work is reserved for Playground.
2. No funnel, no conversion pressure, never add growth-hacking CTAs or steer visitors toward a single path.
3. Playground is its own room, it should feel like a different identity, not a diluted or unified extension of the main portfolio.
4. Content authenticity, project descriptions come from live GitHub data; never hand-write or embellish project copy beyond what the repo states.

## Accessibility & Inclusion

Not yet established as an explicit requirement, open gap, see audit.
