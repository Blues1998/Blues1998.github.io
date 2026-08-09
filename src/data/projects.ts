import { getPublicRepos, repoSlug, repoTech, type Repo } from "../lib/github";

export interface CuratedProject {
  slug: string;
  title: string;
  summary: string;
  tech: string[];
  // A live demo, if one exists. Internal repos link to their own /projects/
  // detail page; external apps (their own deploy, own domain) link out
  // directly, since the point is to let a visitor actually use the thing.
  href?: string;
  // Whether the source itself is closed, independent of whether href exists,
  // a project can have a live demo without its code being public.
  sourceIsPrivate: boolean;
}

// Public repos to feature on the Projects page. Everything else on GitHub
// stays unlisted here: the portfolio is curated, not a full repo mirror.
export const FEATURED_REPO_NAMES = ["TypingTest1"];

// Hand-curated entries: projects whose repo has no public GitHub page to
// auto-fetch from, or whose live demo lives on its own deploy rather than
// this site's /projects/ detail pages. Summaries are hand-written, sourced
// from each repo's own README, since there's nothing to fetch live for these.
export const privateProjects: CuratedProject[] = [
  {
    slug: "connekt",
    title: "Connekt",
    summary:
      "An offline-first, transport-agnostic P2P messaging engine in Rust that bridges BLE, Wi-Fi Direct, and cloud relay into one mesh, with a Flutter client over FFI.",
    tech: ["Rust", "Flutter", "P2P"],
    sourceIsPrivate: true,
  },
  {
    slug: "cliphoard",
    title: "ClipHoard",
    summary:
      "Cross-platform clipboard sync between macOS and Android over a lightweight WebSocket relay: copy on one device, paste on the other in seconds.",
    tech: ["Swift", "Kotlin", "Python"],
    sourceIsPrivate: true,
  },
  {
    slug: "forgeai",
    title: "ForgeAI",
    summary: "A local-first, multi-provider AI operating system that autonomously plans, executes, tests, and commits software engineering work.",
    tech: ["Python", "AI Agents"],
    sourceIsPrivate: true,
  },
  {
    slug: "cadenza",
    title: "Cadenza",
    summary:
      "An interactive music theory companion: fretboard, circle of fifths, ear training, and a keyboard-driven rhythm game for learning real songs, in light and dark themes.",
    tech: ["TypeScript", "React", "Web Audio"],
    href: "https://blues1998.github.io/Cadenza/",
    sourceIsPrivate: false,
  },
  {
    slug: "rtmp",
    title: "RTMP",
    summary:
      "A synchronized movie-watching platform: upload a film, share a link, and everyone in the room stays in lockstep on play, pause, and seek, with chat and no account required to join.",
    tech: ["Python", "Django", "WebSockets"],
    href: "https://rtmp-d600.onrender.com/",
    sourceIsPrivate: true,
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

  const privateDisplay: DisplayProject[] = privateProjects.map((p) => ({
    slug: p.slug,
    title: p.title,
    summary: p.summary,
    tech: p.tech,
    href: p.href,
    isPrivate: p.sourceIsPrivate,
  }));

  return [...privateDisplay, ...publicProjects];
}
