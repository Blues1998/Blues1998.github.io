// Content arrival.
//
// The site navigates as a camera move - HomeCosmos dives toward the
// destination object and base.css fades <main> with it - but the page's own
// content had no part in that. It arrived as one finished slab the instant
// the fade released, which is what made every inner page feel static next
// to the scene behind it. This assembles it instead: the heading lands
// first, then what follows it, in order down the page.
//
// Two rules keep it from becoming a nuisance:
//
//   1. Anything already on screen at load plays its stagger straight away.
//      Only what's below the fold waits to be scrolled to. Reversing that
//      would mean staring at a blank page until you scrolled.
//   2. The stagger is capped. A long list (Projects, Photography) would
//      otherwise take a full second before its last row appeared, and the
//      point is to make arrival feel deliberate, not slow.
//
// Nothing here hides content on its own. The hidden state lives in CSS,
// behind both a server-rendered attribute on <main> (which pages opt in)
// and a runtime one on <html> (JS present, motion allowed), so a visitor
// without JavaScript is served the page exactly as it always was.

// Re-arms the hidden state after a client-side navigation.
//
// The inline head script that first sets this attribute runs once per
// document, and a view-transitions swap replaces <html>'s attributes
// wholesale with the incoming document's - which don't include it, because
// it was never in the markup. So on every navigation after the first the
// gate was simply absent, the CSS hid nothing, and inner pages arrived
// fully formed exactly as they used to. astro:after-swap is the moment to
// put it back: the new DOM is in place and has not been painted yet.
export function armArrival(): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  document.documentElement.setAttribute("data-arrive", "");
}

const STEP_MS = 70;
// Past this many units the stagger stops growing, so the tail of a long
// page arrives as a group rather than trailing off into a queue.
const MAX_STEPPED = 8;

// A unit is the thing that arrives: for a <section>, each of its own
// children (heading, paragraph, list) rather than the section as a whole,
// which is what makes the content assemble rather than appear in slabs.
// An element that is not in normal flow is not part of the page reading
// down the screen, and animating it as though it were is at best wrong and
// at worst destructive: the Photography lightbox is a fixed, full-screen
// dialog that happens to be a child of <main>, and treating it as a unit
// meant the reveal fought its own closed state.
function inFlow(el: HTMLElement): boolean {
  const position = getComputedStyle(el).position;
  return position !== "fixed" && position !== "absolute";
}

function collectUnits(main: Element): HTMLElement[] {
  const units: HTMLElement[] = [];

  function consider(el: HTMLElement) {
    if (inFlow(el)) {
      units.push(el);
      return;
    }
    // Exempt, but *marked* exempt rather than simply left alone. The hidden
    // state is CSS keyed on the absence of this attribute, so an element
    // that is never marked is an element that is never shown - skipping the
    // lightbox outright swapped one bug (permanently open) for its mirror
    // image (permanently invisible, and with it every photo on the page).
    el.dataset.arrived = "";
  }

  for (const child of Array.from(main.children)) {
    if (!(child instanceof HTMLElement)) continue;
    if (child.tagName === "SECTION" && child.childElementCount > 0) {
      for (const grand of Array.from(child.children)) {
        if (grand instanceof HTMLElement) consider(grand);
      }
    } else {
      consider(child);
    }
  }
  return units;
}

function show(el: HTMLElement, order: number) {
  el.style.transitionDelay = `${Math.min(order, MAX_STEPPED) * STEP_MS}ms`;
  el.dataset.arrived = "";
}

export function runArrival(): void {
  const main = document.getElementById("main");
  if (!main || !main.hasAttribute("data-arrive")) return;
  if (!document.documentElement.hasAttribute("data-arrive")) return;

  const units = collectUnits(main);
  if (units.length === 0) return;

  // 0.92 rather than 1: something whose top edge sits a hair above the
  // fold is still part of what you're looking at, and holding it back
  // would leave a visible gap at the bottom of the first screen.
  const fold = window.innerHeight * 0.92;
  const waiting: HTMLElement[] = [];
  let immediate = 0;

  units.forEach((el) => {
    if (el.getBoundingClientRect().top < fold) show(el, immediate++);
    else waiting.push(el);
  });

  if (waiting.length === 0) return;

  // Deliberately a scroll sweep rather than an IntersectionObserver.
  //
  // An observer reports *transitions*, and the case that matters here
  // produces none: jump to the bottom of the page in one movement - End,
  // an anchor link, a restored scroll position - and an element goes from
  // "below the fold, not intersecting" to "above the viewport, not
  // intersecting" without ever being reported. Every unit it skipped over
  // would stay invisible for good. Measured directly, that was three of
  // seven units on a short viewport.
  //
  // Testing rects on each scroll frame is the thing an observer normally
  // saves you from, but the list here is a handful of elements, it only
  // shrinks, and it detaches itself the moment it empties.
  let pending = waiting;
  let queued = false;

  function sweep() {
    queued = false;
    // The same 0.88 the initial pass uses, from the other edge: an element
    // is "arrived at" once its top has come up into the last eighth of the
    // viewport, so it animates where you're looking rather than while
    // clipped by the bottom edge. A negative top - scrolled past - is
    // covered by the same comparison.
    const line = window.innerHeight * 0.88;
    const still: HTMLElement[] = [];
    let order = 0;
    for (const el of pending) {
      if (el.getBoundingClientRect().top < line) show(el, order++);
      else still.push(el);
    }
    pending = still;
    if (pending.length === 0) detach();
  }

  function onScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(sweep);
  }

  function detach() {
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
    document.removeEventListener("astro:before-swap", detach);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  // The page is swapped out from under this on client-side navigation, and
  // these handlers would otherwise keep sweeping a set of elements that is
  // no longer in the document.
  document.addEventListener("astro:before-swap", detach);
}
