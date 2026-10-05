import type { Metadata } from "next";
import "./globals.css";
import Entete from "@/components/Entete";
import Pied from "@/components/Pied";
import { SITE } from "@/lib/config";

// Rendu serveur à chaque requête : l'en-tête dépend de la session de l'utilisateur.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: SITE.nom, template: `%s · ${SITE.nom}` },
  description: SITE.signature,
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Spectral:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap" />
      </head>
      <body>
        <Entete />
        <main><div className="conteneur">{children}</div></main>
        <Pied />
      </body>
    </html>
  );
}
