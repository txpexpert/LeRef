import Link from "next/link";
import { notFound } from "next/navigation";
import { getBase, getSommaire, getDernieresMaj } from "@/lib/contenu";
import { accesGuide } from "@/lib/session";
import { dateFr } from "@/lib/format";
import NavGuide from "@/components/NavGuide";

export async function generateMetadata({ params }: { params: { base: string } }) {
  const b = await getBase(params.base);
  return b ? { title: b.titre, description: b.description ?? undefined } : {};
}

export default async function Guide({ params }: { params: { base: string } }) {
  const base = await getBase(params.base);
  if (!base) notFound();
  const [sommaire, acces, maj] = await Promise.all([getSommaire(base.slug), accesGuide(base.slug), getDernieresMaj(base.slug, 6)]);
  const prevus = sommaire.parties.reduce((n, p) => n + p.chapitres.length, 0);

  return (
    <>
      <NavGuide base={base} actif="sommaire" />
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 22, alignItems: "start" }} className="lecteur-guide">
        <div>
          <div className="titre-section">
            <h1 style={{ fontSize: "1.7rem" }}>Sommaire</h1>
            <span className="muet">{sommaire.total} paragraphes · {sommaire.parties.length} parties · {prevus} chapitres</span>
          </div>
          {!acces.ok && (
            <p className="message info">Les titres sont consultables librement. Les paragraphes marqués <span className="badge ok">Accès libre</span> sont lisibles sans abonnement.</p>
          )}
          {sommaire.parties.map((p, i) => {
            const n = p.chapitres.reduce((k, c) => k + c.paragraphes.length, 0);
            return (
              <details key={p.num} className="sommaire-partie" open={i === 0 || n > 0}>
                <summary><span className="num">Partie {p.num}</span><h2>{p.titre}</h2><span className="compte">{n} paragraphe{n > 1 ? "s" : ""}</span></summary>
                {p.chapitres.map((c) => (
                  <div key={c.code} className="sommaire-chap">
                    <h3><Link href={`/${base.slug}/chapitre/${c.code}`} style={{ color: "inherit", textDecoration: "none" }}><span className="num muet">{c.code}</span> {c.titre}</Link></h3>
                    {c.paragraphes.length === 0 ? <div className="vide">En cours de rédaction</div> : (
                      <ul>
                        {c.paragraphes.map((x) => (
                          <li key={x.num}>
                            {acces.ok || x.gratuit ? (
                              <Link href={`/${base.slug}/p/${x.num}`}>
                                <span className="num">{x.num}</span><span>{x.titre}</span>
                                {x.gratuit && !acces.ok && <span className="badge ok">Accès libre</span>}
                                {x.modifie && <span className="badge alerte">Modifié</span>}
                              </Link>
                            ) : (
                              <span className="verrou" title="Réservé aux abonnés"><span className="num">{x.num}</span><span>{x.titre}</span></span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </details>
            );
          })}
        </div>
        <aside className="pile">
          <div className="carte">
            <h2>Présentation</h2>
            {(base.edition || base.a_jour_au) && (
              <p style={{ margin: "0 0 8px" }}>
                {base.edition && <span className="badge info">{base.edition}</span>}{" "}
                {base.a_jour_au && <span className="badge ok">À jour au {dateFr(base.a_jour_au)}</span>}
              </p>
            )}
            <p className="muet" style={{ margin: 0 }}>{base.description}</p>
            {base.liminaires && (
              <ul className="liste-maj" style={{ marginTop: 10 }}>
                <li><Link href={`/${base.slug}/presentation`}>Avertissement, mode d&apos;emploi et abréviations</Link></li>
                <li><Link href={`/${base.slug}/annexes`}>Logigrammes et modèles d&apos;actes</Link></li>
                <li><Link href={`/${base.slug}/textes`}>Table des textes cités</Link></li>
              </ul>
            )}
          </div>
          <div className="carte">
            <h2>Dernières mises à jour</h2>
            <ul className="liste-maj">
              {maj.map((m) => (
                <li key={m.num}>
                  <span className="num muet">{dateFr(m.maj)}</span>{" "}
                  {acces.ok ? <Link href={`/${base.slug}/p/${m.num}`}>n° {m.num} {m.titre}</Link> : <span>n° {m.num} {m.titre}</span>}
                </li>
              ))}
            </ul>
          </div>
          {!acces.ok && (
            <div className="carte">
              <h2>Accéder au guide complet</h2>
              <p className="muet" style={{ marginTop: 0 }}>Essai gratuit, puis abonnement annuel pour vous ou votre équipe.</p>
              <Link className="btn" href="/inscription">Essai gratuit</Link>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
