const USERNAME = 'Blues1998';
const BASE = 'https://api.github.com';

function apiHeaders(accept = 'application/vnd.github.v3+json'): HeadersInit {
  const h: Record<string, string> = { Accept: accept };
  const token = import.meta.env.GITHUB_TOKEN;
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

export interface Repo {
  name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  topics: string[];
  stargazers_count: number;
  pushed_at: string;
  default_branch: string;
}

// globalThis cache survives Astro's module cache-busting across pages in one build run
function cache(): { repos: Repo[] | null; readmes: Map<string, string | null> } {
  const g = globalThis as Record<string, unknown>;
  if (!g.__gh_cache__) {
    g.__gh_cache__ = { repos: null, readmes: new Map<string, string | null>() };
  }
  return g.__gh_cache__ as { repos: Repo[] | null; readmes: Map<string, string | null> };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* One transient failure here used to take the whole deploy with it.
 *
 * This runs at build time, so `throw` meant that a GitHub blip, a
 * secondary rate limit, or a runner with flaky egress blocked shipping
 * anything at all - including changes with nothing to do with GitHub.
 * A 502 from someone else's API is not a reason a CSS fix cannot go out.
 *
 * So: retry the retryable, and treat total failure as degraded content
 * rather than a broken build. 429 and 5xx are worth another attempt;
 * a 404 on the username never will be, so it fails fast instead of
 * sleeping through three rounds to reach the same answer.
 */
async function fetchRepos(): Promise<Repo[]> {
  const url = `${BASE}/users/${USERNAME}/repos?type=public&per_page=100&sort=pushed`;
  const ATTEMPTS = 3;
  let last = "";

  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, { headers: apiHeaders() });
      if (res.ok) {
        const all: (Repo & { fork: boolean; archived: boolean })[] = await res.json();
        return all.filter((r) => !r.fork && !r.archived);
      }
      last = `HTTP ${res.status}`;
      // 403 with the remaining count at zero is the rate limit wearing a
      // permissions error's status code; anything else 4xx is a real
      // answer that will not change on a retry.
      const rateLimited =
        res.status === 429 ||
        (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0");
      if (res.status < 500 && !rateLimited) break;
    } catch (err) {
      last = err instanceof Error ? err.message : String(err);
    }
    if (attempt < ATTEMPTS) await sleep(attempt * 1500);
  }

  // Loud, because the alternative is a site that quietly ships without a
  // project and nobody notices until someone goes looking for it.
  console.warn(
    `\n[github] Could not reach the GitHub API after ${ATTEMPTS} attempts (${last}).\n` +
      `[github] Building WITHOUT repo-backed projects: the curated entries in\n` +
      `[github] src/data/projects.ts still ship, but anything sourced from a\n` +
      `[github] live repo - and its /projects/<slug>/ detail page - will be\n` +
      `[github] missing from this build. Re-run once the API is reachable.\n`
  );
  return [];
}

export async function getPublicRepos(): Promise<Repo[]> {
  const c = cache();
  if (c.repos) return c.repos;
  c.repos = await fetchRepos();
  return c.repos;
}

export async function getRepoReadme(repo: Repo): Promise<string | null> {
  const c = cache();
  if (c.readmes.has(repo.name)) return c.readmes.get(repo.name)!;

  const res = await fetch(`${BASE}/repos/${USERNAME}/${repo.name}/readme`, {
    headers: apiHeaders('application/vnd.github.v3.raw'),
  });

  const markdown = res.ok ? await res.text() : null;
  const result = markdown ? rewriteImageUrls(markdown, repo) : null;
  c.readmes.set(repo.name, result);
  return result;
}

function rewriteImageUrls(markdown: string, repo: Repo): string {
  const raw = `https://raw.githubusercontent.com/${USERNAME}/${repo.name}/${repo.default_branch}`;
  return markdown.replace(
    /!\[([^\]]*)\]\((?!https?:\/\/|\/\/)([^)]+)\)/g,
    (_, alt, path) => `![${alt}](${raw}/${path.replace(/^\.?\/?/, '')})`
  );
}

export function repoSlug(repo: Repo): string {
  return repo.name.toLowerCase();
}

export function repoTech(repo: Repo): string[] {
  const tags: string[] = [];
  if (repo.language) tags.push(repo.language);
  tags.push(...repo.topics);
  return [...new Set(tags)];
}
