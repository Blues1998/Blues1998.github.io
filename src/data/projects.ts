import { getPublicRepos, repoSlug, repoTech, type Repo } from "../lib/github";

export interface CuratedProject {
  slug: string;
  title: string;
  summary: string;
  tech: string[];
}

// Public repos to feature on the Projects page. Everything else on GitHub
// stays unlisted here: the portfolio is curated, not a full repo mirror.
export const FEATURED_REPO_NAMES = ["TypingTest1"];

// Private repos with no public GitHub page. Summaries are hand-written,
// sourced from each repo's own README, since there's nothing to fetch live.
export const privateProjects: CuratedProject[] = [
  {
    slug: "connekt",
    title: "Connekt",
    summary:
      "An offline-first, transport-agnostic P2P messaging engine in Rust that bridges BLE, Wi-Fi Direct, and cloud relay into one mesh, with a Flutter client over FFI.",
    tech: ["Rust", "Flutter", "P2P"],
  },
  {
    slug: "cliphoard",
    title: "ClipHoard",
    summary:
      "Cross-platform clipboard sync between macOS and Android over a lightweight WebSocket relay: copy on one device, paste on the other in seconds.",
    tech: ["Swift", "Kotlin", "Python"],
  },
  {
    slug: "forgeai",
    title: "ForgeAI",
    summary: "A local-first, multi-provider AI operating system that autonomously plans, executes, tests, and commits software engineering work.",
    tech: ["Python", "AI Agents"],
  },
  {
    slug: "cadenza",
    title: "Cadenza",
    summary: "An interactive music theory companion with fretboard, circle of fifths, and piano visualizations, in light and dark themes.",
    tech: ["TypeScript"],
  },
];

export interface DisplayProject {
  slug: string;
  title: string;
  summary: string;
  tech: string[];
  href?: string;
  isPrivate: boolean;
}

export async function getCuratedProjects(): Promise<DisplayProject[]> {
  const allRepos = await getPublicRepos();
  const featured = FEATURED_REPO_NAMES.map((name) => allRepos.find((r) => r.name === name)).filter((r): r is Repo => Boolean(r));

  const publicProjects: DisplayProject[] = featured.map((repo) => ({
    slug: repoSlug(repo),
    title: repo.name,
    summary: repo.description ?? "No description.",
    tech: repoTech(repo),
    href: `/projects/${repoSlug(repo)}/`,
    isPrivate: false,
  }));

  const privateDisplay: DisplayProject[] = privateProjects.map((p) => ({ ...p, isPrivate: true }));

  return [...privateDisplay, ...publicProjects];
}
