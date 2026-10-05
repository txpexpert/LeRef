import Link from "next/link";
import { listeBases } from "@/lib/contenu";
import { SITE } from "@/lib/config";

export default async function Accueil() {
  const bases = await listeBases();
  const premier = bases[0]?.slug;
  return (
    <>
      <section className="heros pleine">
        <div className="conteneur">
          <span className="etiquette">Référentiels professionnels · mise à jour continue</span>
          <h1>La réglementation marocaine, expliquée paragraphe par paragraphe</h1>
          <p>Texte applicable, position de l&apos;administration, données clés, cas pratiques et conseils d&apos;expert. Chaque notion a son numéro, chaque mise à jour est datée et tracée.</p>
          {premier && (
            <form action={`/${premier}/recherche`}>
              <input name="q" type="search" placeholder="Rechercher un régime, une procédure, une circulaire…" aria-label="Rechercher" />
              <button className="btn laiton" type="submit">Rechercher</button>
            </form>
          )}
        </div>
      </section>

      <div className="titre-section"><h2>Nos guides</h2></div>
      <div className="grille-3" style={{ marginBottom: 40 }}>
        {bases.map((b) => (
          <Link key={b.slug} className="guide-carte" href={`/${b.slug}`}>
            <span className="etiquette">{b.sous_titre ?? "Guide"}</span>
            <h3>{b.titre}</h3>
            <p className="muet" style={{ margin: 0 }}>{b.description}</p>
            <span className="btn secondaire petit" style={{ justifySelf: "start" }}>Consulter le sommaire</span>
          </Link>
        ))}
        {bases.length < SITE.guidesPrevus && (
          <div className="guide-carte a-venir">
            <span className="etiquette">Prochainement</span>
            <h3>{SITE.guidesPrevus - bases.length > 1 ? `${["", "", "Deux", "Trois", "Quatre", "Cinq", "Six"][SITE.guidesPrevus - bases.length] ?? SITE.guidesPrevus - bases.length} autres domaines` : "Un nouveau domaine"}</h3>
            <p className="muet" style={{ margin: 0 }}>De nouveaux guides rejoignent la plateforme, avec la même méthode : paragraphes numérotés, sources citées, mises à jour tracées.</p>
          </div>
        )}
      </div>

      <div className="titre-section"><h2>Ce que vous trouvez dans chaque paragraphe</h2></div>
      <div className="atouts" style={{ marginBottom: 40 }}>
        <div><h3>Le texte applicable</h3><p>Articles, décrets et circulaires cités avec leur référence exacte et leur date.</p></div>
        <div><h3>La position de l&apos;administration</h3><p>Ce que disent les circulaires et notes, et comment elles s&apos;articulent.</p></div>
        <div><h3>Les données clés</h3><p>Délais, seuils, autorités compétentes et pièces exigées, lisibles en un coup d&apos;œil.</p></div>
        <div><h3>Le conseil de l&apos;expert</h3><p>Cas pratique, pièges fréquents et bonnes pratiques tirés du terrain.</p></div>
      </div>

      <div className="carte" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: "1.3rem" }}>Essayez gratuitement pendant {SITE.essaiJours} jours</h2>
          <p className="muet" style={{ margin: "4px 0 0" }}>Sans engagement. Accès réservé aux entreprises et professionnels du secteur privé.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link className="btn" href="/inscription">Créer un compte</Link>
          <Link className="btn secondaire" href="/tarifs">Voir les formules</Link>
        </div>
      </div>
    </>
  );
}
