import { defineCollection, z } from "astro:content";

const projects = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    tags: z.array(z.string()),
    featured: z.boolean().default(false),
    order: z.number().optional(),
    liveUrl: z.string().refine(
      (v) => v.startsWith("/") || v.startsWith("http"),
      "liveUrl must be a relative or absolute URL"
      ).optional(),
    status: z.enum([
        "under-development",
        "finished",
        "archived",
      ]),
  }),
});

export const collections = {
  projects,
};
