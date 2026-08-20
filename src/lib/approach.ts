// The approach.
//
// The homepage is a vehicle: scrolling it flies a camera through six
// objects, and "02 / 06" means a place you are travelling to. Clicking one
// used to end that - you landed on a document, in a centred 70ch column,
// where scrolling meant a scrollbar again and the object you had just flown
// to sat behind the text as decoration that no longer responded to
// anything. The journey was committed to on the homepage and abandoned on
// arrival.
//
// This module makes an inner page the last leg of the same trip. Scroll
// position becomes approach progress, and everything spatial keys off it:
//
//   - the camera closes on the page's own object and orbits it a little
//     (HomeCosmos reads `t` every frame - see the backdrop branch of
//     computeCameraTarget)
//   - the approach scale down the left edge marks each section as a station
//     and shows where along the leg you are, which is the scrollbar's job
//     restated in the site's own terms
//   - the starfield gains a little forward drift, which on viewports below
//     the scene's 900px cutoff is the *only* thing carrying the motion, so
//     it is deliberately not gated to desktop
//
// Ownership matters here. Progress is computed in exactly one place and
// published on `window.__approach`, because HomeCosmos and the scale both
// need it every frame and two independent scroll readers would drift by a
// frame and disagree about which station is lit. The scene polls that
// object rather than receiving events: it already runs a rAF loop, and a
// scroll-rate event stream into a frame loop is just a queue that makes the
// same value arrive late.

import { DESTINATIONS, destinationIndex } from "./destinations";

export interface ApproachState {
  /** 0 at the top of the page, 1 at the bottom. Eased, not raw scroll. */
  t: number;
  /** Index of the station currently in the reading band. */
  station: number;
  /** How many stations this page has. */
  stations: number;
  /** False when the page is too short to scroll: there is no leg to fly,
      so the camera holds its arrival pose and the scale renders as a
      single mark rather than pretending to a journey it cannot offer. */
  travelable: boolean;
}

declare global {
  interface Window {
    __approach?: ApproachState;
    __approachBound?: boolean;
  }
}

// Below this the page does not meaningfully scroll and the whole mechanism
// switches off. A page with 80px of overflow would otherwise fly the entire
// approach in one flick of the wheel, which reads as a glitch rather than
// as travel.
const MIN_TRAVEL_PX = 240;

// Where down the viewport a station counts as "the one you are reading".
// Above centre, because you read from the top of a block: by the time a
// heading reaches the middle of the screen you are already several lines
// into what follows it.
const READING_LINE = 0.38;

const state: ApproachState = { t: 0, station: 0, stations: 0, travelable: false };

export function approachState(): ApproachState {
  return state;
}

export function initApproach(): void {
  const main = document.getElementById("main");
  // Content routes only. The homepage runs its own scroll-driven camera and
  // would fight this one for the same wheel; the full-screen playground
  // pages and the terminal have no prose and no stations. Both are exactly
  // the set that opts into data-arrive, so that attribute is the gate.
  if (!main || !main.hasAttribute("data-arrive")) {
    teardown();
    return;
  }

  const sections = Array.from(main.querySelectorAll<HTMLElement>(":scope > section"));
  if (sections.length === 0) {
    teardown();
    return;
  }

  state.stations = sections.length;
  state.station = 0;
  state.t = 0;
  window.__approach = state;

  // Appended before the first measure() so that its height is already in
  // scrollHeight when progress is first computed - otherwise the leg is
  // measured against a document one element shorter than the one being
  // scrolled, and `t` never quite reaches 1.
  const departure = buildDeparture(main);
  const scale = buildScale(sections);
  document.documentElement.setAttribute("data-approach", "");

  // Reduced motion gets the scale - it is information, and a static
  // progress readout is not motion - but never the scroll-linked camera or
  // the section depth. `t` stays pinned at 0, which is precisely the pose
  // every one of those visitors already had.
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let queued = false;

  function measure() {
    queued = false;
    const doc = document.documentElement;
    const scrollable = doc.scrollHeight - window.innerHeight;
    state.travelable = scrollable >= MIN_TRAVEL_PX;

    const raw = state.travelable
      ? Math.min(1, Math.max(0, window.scrollY / scrollable))
      : 0;
    // smoothstep, so the leg leaves and arrives at zero velocity instead of
    // the camera jerking into motion on the first pixel of scroll.
    state.t = still ? 0 : raw * raw * (3 - 2 * raw);

    const line = window.innerHeight * READING_LINE;
    let active = 0;
    for (let i = 0; i < sections.length; i++) {
      if (sections[i].getBoundingClientRect().top <= line) active = i;
    }
    // The bottom of the page belongs to the last station regardless of
    // where its top edge landed: a short final section on a tall viewport
    // can sit entirely below the reading line even when it is all that is
    // left to read.
    if (state.travelable && raw > 0.995) active = sections.length - 1;
    if (active !== state.station) {
      state.station = active;
      scale.setStation(active);
      sections.forEach((s, i) => {
        s.dataset.station = i < active ? "passed" : i === active ? "active" : "ahead";
      });
    }
    scale.setProgress(raw, state.travelable);
  }

  function onScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(measure);
  }

  measure();
  // measure() only repaints station state on *change*, and on a fresh page
  // the active station is usually 0 - which is what it was initialised to,
  // so nothing would ever be marked. Paint the initial state explicitly.
  scale.setStation(state.station);
  sections.forEach((s, i) => {
    s.dataset.station = i === state.station ? "active" : i < state.station ? "passed" : "ahead";
  });

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });

  cleanup = () => {
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
    scale.remove();
    departure?.remove();
    document.documentElement.removeAttribute("data-approach");
    state.t = 0;
    state.travelable = false;
    state.stations = 0;
    window.__approach = undefined;
  };
}

let cleanup: (() => void) | null = null;

function teardown(): void {
  if (cleanup) cleanup();
  cleanup = null;
}

// The departure.
//
// A leg that only ever closes on something has no end - you read to the
// bottom of the page and the journey simply stops, which is the same
// dead-end the old inner pages had, just with a better camera. This is what
// the end of the approach is *for*: the next destination in journey order,
// named and numbered in the same voice as the homepage menu that sent you
// here, so reaching the bottom of a page aims you at somewhere rather than
// leaving you to find the nav again.
//
// It wraps: after Contact (06) comes Playground (01). The six objects are a
// circuit, not a queue, and dead-ending the last one would make Contact the
// only page you can't leave by continuing.
//
// Built in script for the same reason the scale is - it is a projection of
// where you are, not content - and it duplicates navigation that the header
// and footer already carry, so a visitor without JavaScript loses a
// shortcut and nothing else.
function buildDeparture(main: HTMLElement): HTMLElement | null {
  const index = destinationIndex(location.pathname);
  if (index < 0) return null;
  const next = DESTINATIONS[(index + 1) % DESTINATIONS.length];
  const nextIndex = String(((index + 1) % DESTINATIONS.length) + 1).padStart(2, "0");

  const el = document.createElement("nav");
  el.className = "departure";
  el.setAttribute("aria-label", "Continue the journey");

  const link = document.createElement("a");
  link.className = "departure-link";
  link.href = `${import.meta.env.BASE_URL}${next.slug}/`;
  // Playground boots its own full-screen apps, which the client router
  // cannot swap into cleanly - the same exemption HomeMenu makes.
  if (next.hardReload) link.setAttribute("data-astro-reload", "");

  const label = document.createElement("span");
  label.className = "departure-label";
  label.textContent = "Next";

  const name = document.createElement("span");
  name.className = "departure-name";
  name.textContent = next.label;

  const idx = document.createElement("span");
  idx.className = "departure-index";
  idx.textContent = nextIndex;

  link.append(label, idx, name);
  el.appendChild(link);
  // The arrival animation hides every child of <main> that it has not
  // itself marked as arrived (see lib/arrive.ts and the data-arrive rules
  // in base.css). It has already run by the time this is appended, so
  // without the mark this element is created, laid out, and permanently
  // invisible - which is exactly what happened the first time.
  el.dataset.arrived = "";
  main.appendChild(el);
  return el;
}

interface Scale {
  setStation(i: number): void;
  setProgress(p: number, travelable: boolean): void;
  remove(): void;
}

// The approach scale.
//
// A scrollbar answers "how much of this document is left", which is a fact
// about a file. This answers "how far along this leg are you, and which
// station are you at" - the same information, told as position rather than
// as remaining bytes, which is the whole difference between a page you
// scroll and a place you are moving through.
//
// Built in script rather than shipped in the markup because it is a
// projection of the page's own structure: one tick per <section>, however
// many that page happens to have. Nothing here is content - a visitor
// without JavaScript loses a progress indicator and keeps every word.
function buildScale(sections: HTMLElement[]): Scale {
  const root = document.createElement("div");
  root.className = "approach-scale";
  // Decorative in the accessibility sense: the headings it indexes are
  // already in the document, in order, and a screen reader announcing a
  // duplicate list of them on every scroll frame would be noise. Real
  // navigation to those headings is what the headings themselves are for.
  root.setAttribute("aria-hidden", "true");

  const index = destinationIndex(location.pathname);
  const total = String(DESTINATIONS.length).padStart(2, "0");
  const current = index >= 0 ? String(index + 1).padStart(2, "0") : "--";

  const head = document.createElement("div");
  head.className = "approach-index";
  head.textContent = `${current}/${total}`;
  root.appendChild(head);

  const rail = document.createElement("div");
  rail.className = "approach-rail";

  const fill = document.createElement("div");
  fill.className = "approach-fill";
  rail.appendChild(fill);

  // A page with one section has one station, and a single mark pinned to
  // the top of the rail reads as a list that failed to render rather than
  // as "there is one stop here". Projects is exactly this - one section
  // holding the whole grid - and there the fill alone says everything the
  // rail has to say.
  const ticks = (sections.length < 2 ? [] : sections).map((section, i) => {
    const tick = document.createElement("div");
    tick.className = "approach-tick";
    // Evenly spaced rather than proportional to each section's height. The
    // rail is a station list, not a scaled map of the document: on
    // Photography one section is a two-line header and the other is a
    // forty-image grid, and spacing the marks by height would put both
    // ticks within a few pixels of the top and say nothing.
    //
    // Written as a custom property, not as `top`, because the rail lies
    // flat below 1100px and the same percentage has to mean `left` there.
    // Which axis it is on is a layout decision, so CSS makes it.
    tick.style.setProperty(
      "--tick-pos",
      sections.length === 1 ? "0%" : `${(i / (sections.length - 1)) * 100}%`,
    );
    rail.appendChild(tick);
    return tick;
  });

  root.appendChild(rail);
  document.body.appendChild(root);

  return {
    setStation(active) {
      ticks.forEach((tick, i) => {
        tick.dataset.state = i < active ? "passed" : i === active ? "active" : "ahead";
      });
    },
    setProgress(p, travelable) {
      root.dataset.travelable = String(travelable);
      // A bare number, not a transform. The rail is vertical on a wide
      // window and horizontal below 1100px, so the axis this scales along
      // is a layout decision - writing `scaleY` here scaled the flat rail's
      // 2px *height* and the phone fallback showed no progress at all.
      fill.style.setProperty("--fill", p.toFixed(4));
    },
    remove() {
      root.remove();
    },
  };
}

/** Bound once against the never-swapped document, the same guard every
    other listener in BaseLayout uses: this module's script tag re-executes
    on each client-side navigation. */
export function bindApproach(): void {
  if (window.__approachBound) return;
  window.__approachBound = true;
  document.addEventListener("astro:page-load", initApproach);
  document.addEventListener("astro:before-swap", teardown);
}
