import rss from "@astrojs/rss";
import { getCollection } from "astro:content";

export async function GET(context) {
  const projects = await getCollection("projects");

  return rss({
    title: "Animesh Singh",
    description: "Engineer. Photographer. Musician.",
    site: context.site,
    items: projects.map((project) => ({
      title: project.data.title,
      description: project.data.summary,
      link: `/projects/${project.slug}/`,
    })),
    customData: `<language>en-us</language>`,
  });
}
