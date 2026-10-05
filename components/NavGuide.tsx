import Link from "next/link";
import type { Base } from "@/lib/contenu";

export default function NavGuide({ base, actif, q }: { base: Base; actif: "sommaire" | "recherche" | "parcours" | "annexes" | "textes" | "presentation" | "lecture"; q?: string }) {
  const onglet = (k: string, href: string, libelle: string) =>
    <Link href={href} aria-current={actif === k ? "page" : undefined}>{libelle}</Link>;
  return (
    <div className="carte navguide">
      <div>
        <span className="etiquette">{base.sous_titre ?? "Guide"}</span>
        <div className="titre-guide">{base.titre}</div>
      </div>
      <nav className="nav" aria-label="Rubriques du guide">
        {onglet("sommaire", `/${base.slug}`, "Sommaire")}
        {onglet("recherche", `/${base.slug}/recherche`, "Recherche")}
        {onglet("parcours", `/${base.slug}/parcours`, "Parcours")}
        {onglet("annexes", `/${base.slug}/annexes`, "Annexes")}
        {onglet("textes", `/${base.slug}/textes`, "Textes cités")}
        {onglet("presentation", `/${base.slug}/presentation`, "Mode d'emploi")}
      </nav>
      <form action={`/${base.slug}/recherche`} className="recherche-rapide" style={{ marginLeft: "auto" }}>
        <input name="q" type="search" defaultValue={q} placeholder="Mot-clé ou n° (ex. 7-012)" aria-label="Rechercher dans le guide" />
      </form>
    </div>
  );
}
