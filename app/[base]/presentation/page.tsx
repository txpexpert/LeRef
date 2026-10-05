// Pages liminaires du guide : édition, avertissement, mode d'emploi, abréviations.
// Page publique (aucun contenu de paragraphe).
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBase } from "@/lib/contenu";
import { dateLongue } from "@/lib/format";
import NavGuide from "@/components/NavGuide";

export async function generateMetadata({ params }: { params: { base: string } }) {
  const b = await getBase(params.base);
  return b ? { title: `Mode d'emploi — ${b.titre}`, description: b.liminaires?.accroche ?? b.description ?? undefined } : {};
}

export default async function Presentation({ params }: { params: { base: string } }) {
  const base = await getBase(params.base);
  if (!base) notFound();
  const l = base.liminaires;
  if (!l) notFound();
  const me = l.mode_emploi;
  return (
    <>
      <NavGuide base={base} actif="presentation" />
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 22, alignItems: "start" }} className="lecteur-guide">
        <article className="document">
          <span className="etiquette">{[l.edition ?? base.edition, base.sous_titre].filter(Boolean).join(" · ")}</span>
          <h1 style={{ margin: "6px 0 4px" }}>{base.titre}</h1>
          {l.accroche && <p className="muet" style={{ margin: "0 0 6px" }}>{l.accroche}</p>}
          {(l.a_jour_au ?? base.a_jour_au) && (
            <div className="meta"><span className="badge ok">À jour au {dateLongue(l.a_jour_au ?? base.a_jour_au)}</span></div>
          )}

          {!!l.avertissement?.length && (
            <div className="bloc"><span className="etiquette">Avertissement</span>
              <div className="corps">{l.avertissement.map((x, i) => <p key={i}>{x}</p>)}</div>
            </div>
          )}

          {me && (
            <div className="bloc"><span className="etiquette">Mode d&apos;emploi</span>
              <div className="corps">
                {me.introduction?.map((x, i) => <p key={i}>{x}</p>)}
                {!!me.rubriques?.length && (
                  <dl className="rubriques">
                    {me.rubriques.map((r) => (
                      <div key={r.rubrique}><dt>{r.rubrique}</dt><dd>{r.texte}</dd></div>
                    ))}
                  </dl>
                )}
                {me.conclusion?.map((x, i) => <p key={i}>{x}</p>)}
              </div>
            </div>
          )}

          {!!l.abreviations?.length && (
            <div className="bloc"><span className="etiquette">Abréviations</span>
              <div className="defile" style={{ border: 0 }}>
                <table className="donnees"><tbody>
                  {l.abreviations.map(([sigle, sens]) => <tr key={sigle}><th>{sigle}</th><td>{sens}</td></tr>)}
                </tbody></table>
              </div>
            </div>
          )}
        </article>
        <aside className="pile">
          <div className="carte">
            <h2>Accès rapide</h2>
            <ul className="liste-maj">
              <li><Link href={`/${base.slug}`}>Sommaire détaillé</Link></li>
              <li><Link href={`/${base.slug}/annexes`}>Logigrammes et modèles d&apos;actes</Link></li>
              <li><Link href={`/${base.slug}/textes`}>Table des textes cités</Link></li>
              <li><Link href={`/${base.slug}/parcours`}>Parcours par situation</Link></li>
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
