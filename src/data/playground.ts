export type PlaygroundPanelTone = "ember" | "frost" | "signal";
// "live" is the only state currently in use. The other three describe work
// that is not yet reachable, and they stay in the union because that is the
// honest label for the next thing that lands here half-built - but nothing
// ships wearing one until it is actually true.
export type PlaygroundPanelState = "live" | "warming" | "incubating" | "under-observation";

export interface PlaygroundPanel {
  slug: string;
  title: string;
  summary: string;
  statusLabel: PlaygroundPanelState;
  tags: string[];
  tone: PlaygroundPanelTone;
  href?: string;
}

export interface PlaygroundRow {
  direction: "ltr" | "rtl";
  items: PlaygroundPanel[];
}

export function groupPlaygroundRows(
  items: PlaygroundPanel[],
  rowSize = 2,
): PlaygroundRow[] {
  const rows: PlaygroundRow[] = [];

  for (let index = 0; index < items.length; index += rowSize) {
    rows.push({
      direction: rows.length % 2 === 0 ? "ltr" : "rtl",
      items: items.slice(index, index + rowSize),
    });
  }

  return rows;
}

// Only things a visitor can actually open and use. The page previously
// padded this list with four invented chambers ("Vault D-07" and friends)
// that had no href and never would - a gallery that was four-fifths prop.
// An empty-looking room reads better than a room full of locked doors, so
// entries land here when they run, not before.
export const playgroundPanels: PlaygroundPanel[] = [
  {
    slug: "endless-drive",
    title: "Wander",
    summary: "An endless, procedural scenic drive through the seasons: day and night, weather that rolls in on its own, and a road that never repeats.",
    statusLabel: "live",
    tags: ["three.js", "procedural", "driving"],
    tone: "ember",
    href: "/playground/endless-drive",
  },
  {
    slug: "focus-reader",
    title: "Focus Reader",
    summary: "A speed-reading surface that flashes one word at a time, anchored on the letter your eye already lands on. Paste text or drop in a PDF and set your own pace.",
    statusLabel: "live",
    tags: ["react", "rsvp", "pdf"],
    tone: "frost",
    href: "/apps/focus-reader/",
  },
];
