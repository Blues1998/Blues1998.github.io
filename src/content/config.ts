import { defineCollection, z } from "astro:content";

const projects = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    tags: z.array(z.string()),
    featured: z.boolean().default(false),
    order: z.number().optional(),
  }),
});

export const collections = {
  projects,
};
