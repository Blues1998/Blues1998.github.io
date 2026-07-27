export type PlaygroundPanelTone = "ember" | "frost" | "signal";
export type PlaygroundPanelState = "warming" | "incubating" | "under-observation";

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

export const playgroundPanels: PlaygroundPanel[] = [
  {
    slug: "endless-drive",
    title: "Wander",
    summary: "An endless, procedural scenic drive through the seasons — day and night, weather that rolls in on its own, and a road that never repeats.",
    statusLabel: "incubating",
    tags: ["three.js", "procedural", "driving"],
    tone: "ember",
    href: "/playground/endless-drive",
  },
  {
    slug: "chamber-a",
    title: "Chamber A-03",
    summary: "A warm vessel for browser matter that has not yet chosen whether it wants to become an interface or an incident.",
    statusLabel: "warming",
    tags: ["shell memory", "soft launch", "unsealed"],
    tone: "ember",
  },
  {
    slug: "field-b",
    title: "Field B-11",
    summary: "Static gathers here in patient layers. Something is learning how to glow before it learns how to speak.",
    statusLabel: "incubating",
    tags: ["signal drift", "phase one", "light test"],
    tone: "frost",
  },
  {
    slug: "bay-c",
    title: "Bay C-02",
    summary: "A quiet chamber for experiments that still prefer atmosphere over explanation and movement over certainty.",
    statusLabel: "under-observation",
    tags: ["low pressure", "motion pass", "field notes"],
    tone: "signal",
  },
  {
    slug: "vault-d",
    title: "Vault D-07",
    summary: "The edges are set, the center is unresolved, and the entire structure is waiting for the right disturbance to wake it.",
    statusLabel: "warming",
    tags: ["dormant core", "stress map", "hold state"],
    tone: "ember",
  },
];
