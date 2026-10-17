// Dossiers = domaines affichés sur la page d'accueil (une couverture chacun).
// Un dossier regroupe un ou plusieurs guides (« bases »). Il est « disponible »
// dès qu'au moins un de ses guides est publié (publie: true dans bases.json).
// Définition : table « dossiers » de Supabase (alimentée par l'import de dossiers.json
// dans Administration › Importer) ; à défaut, ou en mode local, content/dossiers.json.
import "server-only";
import fs from "node:fs";
import path from "node:path";
import { listeBases, type Base } from "./contenu";
import { db, dbConfiguree } from "./supabase/admin";

export type Dossier = {
  slug: string;
  ordre: number;
  court: string;              // libellé court (ex. « Douane »)
  titre: string;              // titre de la couverture
  couverture: string | null;  // ex. /couvertures/douane.webp (dossier public/)
  guides: string[];           // slugs des guides (content/bases.json) rattachés au dossier
};
export type DossierEtat = Dossier & { disponibles: Base[]; disponible: boolean };

async function lireDefinitions(): Promise<Dossier[]> {
  if (dbConfiguree()) {
    const { data, error } = await db().from("dossiers").select("slug, ordre, court, titre, couverture, guides").order("ordre");
    if (!error && data?.length) return data as Dossier[];
  }
  return lireFichier();
}

function lireFichier(): Dossier[] {
  const f = path.join(process.cwd(), "content", "dossiers.json");
  try {
    return fs.existsSync(f) ? (JSON.parse(fs.readFileSync(f, "utf8")) as Dossier[]) : [];
  } catch {
    return []; // JSON invalide : la page d'accueil reste utilisable avec les guides publiés
  }
}

export async function listeDossiers(): Promise<DossierEtat[]> {
  const defs = await lireDefinitions();
  const bases = await listeBases();
  const parSlug = new Map(bases.map((b) => [b.slug, b]));
  const rattaches = new Set(defs.flatMap((d) => d.guides));
  // Un guide publié mais absent de dossiers.json reste visible (sans couverture)
  const orphelins: Dossier[] = bases
    .filter((b) => !rattaches.has(b.slug))
    .map((b) => ({ slug: b.slug, ordre: 1000 + b.ordre, court: b.titre.replace(/^Guide des? /i, ""), titre: b.titre, couverture: null, guides: [b.slug] }));
  return [...defs, ...orphelins]
    .sort((a, b) => a.ordre - b.ordre)
    .map((d) => {
      const disponibles = d.guides.map((s) => parSlug.get(s)).filter((b): b is Base => !!b);
      return { ...d, disponibles, disponible: disponibles.length > 0 };
    });
}

export async function getDossier(slug: string): Promise<DossierEtat | null> {
  return (await listeDossiers()).find((d) => d.slug === slug) ?? null;
}

// Un seul guide publié : lien direct vers son sommaire ; sinon, page du dossier.
export const lienDossier = (d: DossierEtat) =>
  d.disponibles.length === 1 ? `/${d.disponibles[0].slug}` : `/dossier/${d.slug}`;
