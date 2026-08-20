import rss from "@astrojs/rss";
import { getCuratedProjects } from "../data/projects";

/* The feed mirrors the Projects page, not the GitHub account.
 *
 * It used to emit one item per public repo, linking each to
 * /projects/<slug>/ - but detail pages are only built for repos in
 * FEATURED_REPO_NAMES, so of the thirty items in the published feed
 * exactly one resolved and twenty-nine were 404s. The feed was
 * advertising a repo mirror while the site is deliberately curated.
 *
 * getCuratedProjects() is the same call the Projects page makes, so the
 * two can no longer disagree about what exists.
 */
export async function GET(context) {
  const projects = await getCuratedProjects();
  const site = context.site;

  return rss({
    title: "Animesh Singh",
    description:
      "Selected engineering projects: shipped products and public code.",
    site,
    items: projects.map((p) => ({
      title: p.title,
      description: p.summary,
      // Three destinations, in order of how much there is to see:
      // an external live deploy, a built detail page, or - for a project
      // whose source is private and has no demo - the card describing it
      // on the Projects page. Every one of these resolves; the anchor
      // ids are set on the cards in projects/index.astro.
      link: p.href
        ? new URL(p.href, site).href
        : new URL(`/projects/#${p.slug}`, site).href,
      categories: p.tech,
    })),
    customData: `<language>en-us</language>`,
  });
}
