import Link from "next/link";
import { listeBases } from "@/lib/contenu";
import { SITE } from "@/lib/config";
import { listeDossiers, lienDossier } from "@/lib/dossiers";

export default async function Accueil() {
  const [bases, dossiers] = await Promise.all([listeBases(), listeDossiers()]);
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
          <h2 className="couv-titre" id="dossiers">Choisissez un domaine</h2>
          <ul className="couvertures" aria-labelledby="dossiers">
            {dossiers.map((d) => {
              const contenu = (
                <>
                  <span className="couv-img">
                    {d.couverture
                      ? <img src={d.couverture} width={640} height={905} alt={`Couverture — ${d.titre}`} loading="lazy" />
                      : <span className="couv-vide">{d.titre}</span>}
                  </span>
                  <span className="couv-nom">{d.court}<span className="etat">{d.disponible ? "Disponible" : "Bientôt"}</span></span>
                </>
              );
              return (
                <li key={d.slug}>
                  {d.disponible
                    ? <Link className="couv" href={lienDossier(d)} title={d.titre}>{contenu}</Link>
                    : <div className="couv bientot" title={`${d.titre} — prochainement`}>{contenu}</div>}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

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
