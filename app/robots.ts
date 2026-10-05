import type { MetadataRoute } from "next";
import { SITE } from "@/lib/config";

// Moteurs de recherche autorisés sur les pages publiques ; robots d'entraînement des IA refusés.
const ROBOTS_IA = ["GPTBot", "ChatGPT-User", "OAI-SearchBot", "CCBot", "ClaudeBot", "anthropic-ai", "Claude-Web",
  "Google-Extended", "PerplexityBot", "Bytespider", "Amazonbot", "Applebot-Extended", "meta-externalagent", "cohere-ai", "Diffbot"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      ...ROBOTS_IA.map((userAgent) => ({ userAgent, disallow: "/" })),
      { userAgent: "*", allow: "/", disallow: ["/compte", "/admin", "/*/p/", "/*/recherche", "/*/textes", "/*/modeles/", "/*/figures/"] },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
