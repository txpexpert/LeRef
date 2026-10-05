import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getBase, rechercher } from "@/lib/contenu";
import { accesGuide } from "@/lib/session";
import NavGuide from "@/components/NavGuide";
import AccesRefuse from "@/components/AccesRefuse";

export const dynamic = "force-dynamic";
export const metadata = { title: "Recherche", robots: { index: false } };

// Seules les balises <mark> produites par la base sont conservées dans l'extrait
function extraitSur(html: string) {
  const sur = html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/&lt;mark&gt;/g, "<mark>").replace(/&lt;\/mark&gt;/g, "</mark>");
  return { __html: sur };
}

export default async function Recherche({ params, searchParams }: { params: { base: string }; searchParams: { q?: string; page?: string } }) {
  const base = await getBase(params.base);
  if (!base) notFound();
  const q = (searchParams.q ?? "").trim().slice(0, 120);
  const page = Math.max(1, Math.min(20, Number(searchParams.page) || 1));
  const acces = await accesGuide(base.slug);
  if (acces.ok && /^\d+-\d{3}$/.test(q)) redirect(`/${base.slug}/p/${q}`);

  const { resultats, total } = acces.ok && q ? await rechercher(base.slug, q, page) : { resultats: [], total: 0 };
  const pages = Math.ceil(total / 20);
  return (
    <>
      <NavGuide base={base} actif="recherche" q={q} />
      <div className="titre-section"><h1 style={{ fontSize: "1.6rem" }}>Recherche dans le guide</h1></div>
      <form action={`/${base.slug}/recherche`} style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        <input name="q" type="search" defaultValue={q} placeholder="Mot-clé, numéro de paragraphe ou référence de texte (ex. 6538/313)"
          aria-label="Recherche" className="grand-champ" />
        <button className="btn" type="submit">Rechercher</button>
      </form>
      {!acces.ok ? (
        <AccesRefuse raison={acces.raison === "autre_session" ? "anonyme" : acces.raison} retour={`/${base.slug}/recherche?q=${encodeURIComponent(q)}`} />
      ) : !q ? (
        <p className="muet">Tapez un mot-clé, une expression entre guillemets, ou un numéro de paragraphe pour l&apos;ouvrir directement.</p>
      ) : (
        <>
          <p className="muet">{total} paragraphe{total > 1 ? "s" : ""} pour « {q} »</p>
          <div className="resultats">
            {resultats.map((r) => (
              <Link key={r.num} className="resultat" href={`/${base.slug}/p/${r.num}`}>
                <span className="etiquette"><span className="num" style={{ color: "var(--laiton)" }}>n° {r.num}</span> · chapitre {r.chapitre}</span>
                <h3>{r.titre}</h3>
                <p dangerouslySetInnerHTML={extraitSur(r.extrait)} />
              </Link>
            ))}
            {!resultats.length && <div className="carte muet">Aucun résultat. Essayez un terme plus général ou une autre formulation.</div>}
          </div>
          {pages > 1 && (
            <div style={{ display: "flex", gap: 6, marginTop: 16 }}>
              {page > 1 && <Link className="btn secondaire petit" href={`?q=${encodeURIComponent(q)}&page=${page - 1}`}>‹ Précédents</Link>}
              {page < Math.min(pages, 20) && <Link className="btn secondaire petit" href={`?q=${encodeURIComponent(q)}&page=${page + 1}`}>Suivants ›</Link>}
            </div>
          )}
        </>
      )}
    </>
  );
}
