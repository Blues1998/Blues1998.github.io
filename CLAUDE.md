# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm run dev              # dev server on :4321
npm run build            # static build to ./dist
npm run preview          # serve ./dist (use this for any measurement work)
```

There is no test suite and no lint script. Verification here is done by
driving the built site in a browser — see "Verifying changes" below.

`npx astro check` currently exhausts V8's heap on this repo (a
3,400-line `HomeCosmos.astro` plus no `@types/three`). That is
pre-existing and is *not* wired into `npm run build`, which is clean.
Don't treat its failure as a regression you caused.

Deploys are a GitHub Action on push to `main`, building and force-pushing
`dist/` to the `gh-pages` branch.

## The one thing to understand first

Every page renders over a **single persistent WebGL scene**, not a
background image. `HomeCosmos.astro` mounts `#home-cosmos` once, marked
`transition:persist`, so Astro's `<ClientRouter />` carries the same live
canvas and the same camera across client-side navigation. Navigating is a
camera move toward that route's object, not a page load.

Two consequences that catch people out:

- **Anything in `BaseLayout` runs again on every navigation.** Inline
  scripts re-execute (only `transition:persist` elements are exempt), so
  every listener bound against `document` needs a `window.__xBound` guard
  or it stacks one more copy per navigation. Existing code does this;
  match it.
- **Contrast cannot be reasoned about from CSS.** Text sits over a moving,
  self-lit scene. The only valid measurement is sampling rendered pixels
  from a screenshot. See "Verifying changes".

Six destinations map to six scene objects, in a fixed depth order:
Playground (nebula), Projects (planetary system), Photography (galaxy),
Music (pulsar), About (star), Contact (probe).

`src/lib/destinations.ts` is the **single source of journey order**. The
header, the homepage menu, and the approach scale all derive their index
from it, which is what makes "02" mean the same thing in all three.
`HomeCosmos` keeps its own `DEPTH_ORDER` and asserts in dev that the two
agree — if you add or reorder a destination, both must move.

## Architecture

```
src/layouts/BaseLayout.astro      every content route; owns the persistent scene,
                                  chrome, arrival choreography, head metadata
src/layouts/PlaygroundLayout.astro full-screen experiments; its own <head>, no scene
src/components/HomeCosmos.astro    ~3,400 lines: the whole three.js scene
src/lib/cosmos/*                   extracted scene concerns (see below)
src/lib/approach.ts                scroll -> camera progress on inner pages
src/lib/arrive.ts                  staggered content reveal
src/lib/destinations.ts            journey order, single source
src/lib/github.ts                  build-time GitHub API, cached on globalThis
src/data/projects.ts               curated project list; the Projects page and
                                   the RSS feed both render from getCuratedProjects()
```

**`src/lib/cosmos/`** — `timing.ts` (frame-rate-independent easing; the
scene was originally written against a fixed 60Hz step and ran at double
speed on 120Hz panels — use `easeFactor`, never a bare per-frame
constant), `cameraRig.ts` (eased camera with yaw/pitch orbit;
`yaw=pitch=0` reproduces the pre-orbit position math exactly),
`deviceTier.ts`, `starfield.ts`, `pointMotion.ts` (GPU vertex-shader
motion for the two large point clouds), `skyEvents.ts` (meteors, flares,
supernovae), `transitDust.ts`.

### Device tiering is load-bearing

`detectDeviceTier()` gates on coarse pointer / viewport < 900px. The
six-object scene is **desktop-only**: phones build only the starfield and
download none of the model or texture payload. Verified — a mobile route
pulls 0 bytes of it. Anything added inside the `isDesktop` gate is free on
mobile; anything added outside it is not.

### The approach mechanic

On inner pages, scroll is camera movement. `lib/approach.ts` owns progress,
publishes it on `window.__approach`, and `HomeCosmos` **polls** that from
its existing rAF loop. Deliberate: an event stream feeding a frame loop is
a queue that makes the same value arrive late.

`t = 0` is the previously shipped, contrast-verified camera pose. Short
pages, non-scrollers and reduced-motion visitors all sit there, so the
approach can only ever move *away* from a known-good frame. Preserve that
property.

The framing offset is applied along the camera's **right vector**, not
world x. With a yaw, offsetting in world x lets the object drift toward
frame centre — i.e. onto the text, which every contrast guarantee depends
on it not doing.

### Progressive enhancement is real here, not aspirational

Content is hidden by CSS behind *both* a server-rendered attribute on
`<main>` and a runtime one on `<html>`, with a 2.5s failsafe that unhides
everything if the reveal module never loads. No-JS and reduced-motion
visitors get the full page. Don't add a reveal path that can strand
content hidden.

## Conventions

- **Dark only.** `tokens.css` is the single palette; `color-scheme: dark`
  is set so native controls match. There is no light theme.
- **No em dashes in site copy.** Enforced by hand, and README content
  fetched from GitHub is stripped of them at build time.
- **Surfaces are translucent** (`--surface`), because an opaque panel
  punches a hole in the scene behind it. `backdrop-filter` over a canvas
  repainting every frame is affordable on small regions (cards, toolbars)
  and not on full-width elements (nav, footer).
- **Comments explain why, not what**, and often record what was tried and
  rejected. When changing code that carries such a comment, update the
  reasoning rather than deleting it.
- Fonts: `--font-heading` Space Grotesk, `--font-body` Inter,
  `--font-mono` IBM Plex Mono (the "instrument voice" for all labels,
  indices and HUD chrome). `--font-mono` must stay a real webfont, not a
  system stack, or that voice renders differently on every machine.

## Verifying changes

Build, `npm run preview`, then drive it with Playwright (installed ad hoc
in a scratch dir, not a dependency). What matters:

- **Contrast**: screenshot, sample the *rendered pixels* under the text,
  take a median across several frames so a passing sky event doesn't
  fabricate a failure. Measure the **glyph run** (a `Range` over the text
  nodes), not the element box — flex siblings like dividers and badge
  borders sit inside the element rect and get wrongly graded as backdrop.
  Snapshot `getComputedStyle(el).color` *before* blanking text;
  the returned declaration is live and will otherwise report the blanked
  value.
- **Frame budget**: median frame time and dropped-frame percentage, idle
  and while scrolling. Re-measure anything that fails in isolation before
  believing it; back-to-back batches produce false alarms.
- **The matrix that actually breaks things**: reduced motion, no-JS,
  1050/780/390px, client-side navigation (things must rebuild, not stack),
  and a direct load of a deep link.
