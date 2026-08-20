// The six destinations, in journey order.
//
// This order is load-bearing in three places that used to each keep their
// own copy of it: the homepage menu's "02 / 06" readout and six-dot
// indicator (HomeMenu.astro), the scroll-driven camera's waypoint sequence
// (DEPTH_ORDER in HomeCosmos.astro), and the approach scale on inner pages
// (lib/approach.ts). They have to agree - the whole conceit is that the
// index you saw on the homepage is the index you arrive under - and three
// hand-maintained literals is three chances for them not to.
//
// HomeCosmos still declares DEPTH_ORDER separately: there it is also a
// depth ordering for the scene graph, typed against that file's CosmosKey
// union, and pulling it out here would couple scene construction to a
// navigation concern for no benefit. It is asserted against this list at
// runtime instead - see the check beside its declaration.

export interface Destination {
  label: string;
  /** Path segment, no slashes. Also the cosmos object key. */
  slug: string;
  /** Playground boots its own full-screen apps, which the client router
      cannot swap into cleanly - see HomeMenu's original annotation. */
  hardReload?: boolean;
}

export const DESTINATIONS: Destination[] = [
  { label: "Playground", slug: "playground", hardReload: true },
  { label: "Projects", slug: "projects" },
  { label: "Photography", slug: "photography" },
  { label: "Music", slug: "music" },
  { label: "About", slug: "about" },
  { label: "Contact", slug: "contact" },
];

/** Index of the destination a pathname belongs to, or -1 for anywhere else
    (the homepage, the terminal, a playground experiment, a 404). */
export function destinationIndex(pathname: string): number {
  const segment = pathname.replace(/^\/+|\/+$/g, "").split("/")[0];
  return DESTINATIONS.findIndex((d) => d.slug === segment);
}
