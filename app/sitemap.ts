import type { MetadataRoute } from "next";
import { SITE } from "@/lib/config";
import { listeBases } from "@/lib/contenu";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const bases = await listeBases().catch(() => []);
  return [
    { url: SITE.url, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE.url}/tarifs`, changeFrequency: "monthly" },
    ...bases.flatMap((b) => [
      { url: `${SITE.url}/${b.slug}`, changeFrequency: "weekly" as const, priority: 0.9 },
      { url: `${SITE.url}/${b.slug}/parcours`, changeFrequency: "monthly" as const },
      { url: `${SITE.url}/${b.slug}/presentation`, changeFrequency: "monthly" as const },
      { url: `${SITE.url}/${b.slug}/annexes`, changeFrequency: "monthly" as const },
    ]),
  ];
}
