// Table des textes cités : pour chaque texte, les paragraphes qui l'appliquent.
// Réservée aux abonnés (comme les fiches de textes sources).
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBase, getTableTextes } from "@/lib/contenu";
import { accesGuide } from "@/lib/session";
import { RUBRIQUES_TEXTES, rubriqueTexte } from "@/lib/references";
import NavGuide from "@/components/NavGuide";
import AccesRefuse from "@/components/AccesRefuse";

export const dynamic = "force-dynamic";
export const metadata = { title: "Table des textes cités", robots: { index: false, follow: false } };

const ordreNaturel = new Intl.Collator("fr", { numeric: true, sensitivity: "base" });

export default async function TableTextes({ params }: { params: { base: string } }) {
  const base = await getBase(params.base);
  if (!base) notFound();
  const acces = await accesGuide(base.slug);
  if (!acces.ok) return <><NavGuide base={base} actif="textes" /><AccesRefuse raison={acces.raison === "autre_session" ? "anonyme" : acces.raison} retour={`/${base.slug}/textes`} /></>;

  const textes = await getTableTextes(base.slug);
  const groupes = RUBRIQUES_TEXTES.map((r) => ({
    rubrique: r,
    textes: textes.filter((t) => rubriqueTexte(t.libelle) === r).sort((a, b) => ordreNaturel.compare(a.libelle, b.libelle)),
  })).filter((g) => g.textes.length);

  return (
    <>
      <NavGuide base={base} actif="textes" />
      <div className="titre-section">
        <h1 style={{ fontSize: "1.6rem" }}>Table des textes cités</h1>
        <span className="muet">{textes.length} textes · les numéros renvoient aux paragraphes</span>
      </div>
      <nav className="puces" style={{ marginBottom: 16 }} aria-label="Rubriques">
        {groupes.map((g, i) => <a key={g.rubrique} className="puce" href={`#r${i}`}>{g.rubrique} <span className="muet">({g.textes.length})</span></a>)}
      </nav>
      <div className="pile">
        {groupes.map((g, i) => (
          <section key={g.rubrique} id={`r${i}`} className="carte">
            <h2>{g.rubrique}</h2>
            <ul className="liste-maj">
              {g.textes.map((t) => (
                <li key={t.ref} style={{ display: "flex", gap: 10, justifyContent: "space-between", flexWrap: "wrap", borderTop: "1px solid var(--filet)", paddingTop: 6 }}>
                  <Link href={`/${base.slug}/textes/${t.ref}`} style={{ flex: "1 1 360px" }}>{t.libelle}</Link>
                  <span className="puces">
                    {t.nums.map((n) => <Link key={n} className="puce" href={`/${base.slug}/p/${n}`}><span className="num">{n}</span></Link>)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
