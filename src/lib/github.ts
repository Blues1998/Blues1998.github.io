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

export async function getPublicRepos(): Promise<Repo[]> {
  const c = cache();
  if (c.repos) return c.repos;

  const res = await fetch(
    `${BASE}/users/${USERNAME}/repos?type=public&per_page=100&sort=pushed`,
    { headers: apiHeaders() }
  );
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
  const all: (Repo & { fork: boolean; archived: boolean })[] = await res.json();
  c.repos = all.filter((r) => !r.fork && !r.archived);
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
