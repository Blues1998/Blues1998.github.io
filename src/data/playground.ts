export type PlaygroundType = "experiment" | "game" | "prototype" | "idea";
export type PlaygroundStatus = "live" | "in-progress" | "concept" | "archived";

export interface PlaygroundItem {
  slug: string;
  title: string;
  summary: string;
  type: PlaygroundType;
  status: PlaygroundStatus;
  tech: string[];
  primaryHref: string;
  secondaryHref?: string;
  image?: string;
  note?: string;
  featured?: boolean;
}

export interface PlaygroundRow {
  direction: "ltr" | "rtl";
  items: PlaygroundItem[];
}

export function groupPlaygroundRows(
  items: PlaygroundItem[],
  rowSize = 3,
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

export const playgroundItems: PlaygroundItem[] = [
  {
    slug: "focus-reader",
    title: "Focus Reader",
    summary: "A quiet reading experiment for distraction-free long-form focus.",
    type: "prototype",
    status: "live",
    tech: ["React", "Vite", "PDF.js", "UX"],
    primaryHref: "/apps/focus-reader/",
    secondaryHref: "https://github.com/Blues1998/focus-reader",
    note: "Live build available now. I use this as a sandbox for calmer reading interactions.",
    featured: true,
  },
  {
    slug: "terminal-identity",
    title: "Terminal Identity",
    summary: "A hidden terminal page that turns a portfolio intro into a tiny narrative interface.",
    type: "experiment",
    status: "live",
    tech: ["Astro", "CSS", "Motion", "Storytelling"],
    primaryHref: "/terminal/",
    secondaryHref: "https://github.com/Blues1998/blues1998.github.io",
    note: "A small interaction experiment tucked into the site for curious visitors.",
  },
  {
    slug: "photo-globe",
    title: "Photo Globe",
    summary: "A map-like photography surface for browsing images through place and motion instead of lists.",
    type: "experiment",
    status: "live",
    tech: ["React", "globe.gl", "Three.js", "Photography"],
    primaryHref: "/photography/map/",
    secondaryHref: "/photography/",
    note: "This explores spatial browsing and a more immersive entry into the photo archive.",
  },
  {
    slug: "portfolio-lab",
    title: "Portfolio Lab",
    summary: "The website itself as an ongoing prototype for structure, typography, and personal tooling.",
    type: "prototype",
    status: "in-progress",
    tech: ["Astro", "React", "TypeScript", "Design Systems"],
    primaryHref: "https://github.com/Blues1998/blues1998.github.io",
    secondaryHref: "/",
    note: "This repo is where design experiments, new interactions, and content systems get tested first.",
  },
  {
    slug: "agent-observatory",
    title: "Agent Observatory",
    summary: "A concept for visualizing autonomous agents, plans, tools, and handoffs as a living system.",
    type: "idea",
    status: "concept",
    tech: ["Agentic AI", "Visualization", "Systems Design"],
    primaryHref: "https://github.com/Blues1998/blues1998.github.io",
    secondaryHref: "/about/",
    note: "Still a concept. The goal is to make reasoning chains and tool use feel legible and beautiful.",
  },
  {
    slug: "signal-arcade",
    title: "Signal Arcade",
    summary: "A future collection of tiny browser toys where sound, motion, and code respond to each other.",
    type: "game",
    status: "concept",
    tech: ["Web Audio", "Canvas", "Game Feel"],
    primaryHref: "https://github.com/Blues1998/blues1998.github.io",
    secondaryHref: "/music/",
    note: "A placeholder for playful web-native ideas that are more toy than product.",
  },
];
