import rss from "@astrojs/rss";
import { getPublicRepos, repoSlug } from "../lib/github";

export async function GET(context) {
  const repos = await getPublicRepos();

  return rss({
    title: "Animesh Singh",
    description: "Personal site of Animesh Singh, software engineer, photographer, and musician.",
    site: context.site,
    items: repos.map((repo) => ({
      title: repo.name,
      description: repo.description ?? repo.name,
      link: `/projects/${repoSlug(repo)}/`,
      pubDate: new Date(repo.pushed_at),
    })),
    customData: `<language>en-us</language>`,
  });
}
