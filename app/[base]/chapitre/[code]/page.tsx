// Page de chapitre, sur le modèle des pages « Dans ce chapitre » de l'ouvrage :
// paragraphes du chapitre avec leur « En bref », logigrammes et modèles d'actes associés.
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBase, getParagraphe, getSommaire, listeFigures, listeModeles } from "@/lib/contenu";
import { accesGuide } from "@/lib/session";
import { dateFr } from "@/lib/format";
import NavGuide from "@/components/NavGuide";

export async function generateMetadata({ params }: { params: { base: string; code: string } }) {
  return { title: `Chapitre ${params.code}` };
}

export default async function Chapitre({ params }: { params: { base: string; code: string } }) {
  const base = await getBase(params.base);
  if (!base) notFound();
  const [sommaire, acces, figures, modeles] = await Promise.all([getSommaire(base.slug), accesGuide(base.slug), listeFigures(base.slug), listeModeles(base.slug)]);
  const partie = sommaire.parties.find((p) => p.chapitres.some((c) => c.code === params.code));
  const chapitre = partie?.chapitres.find((c) => c.code === params.code);
  if (!partie || !chapitre) notFound();
  const nums = new Set(chapitre.paragraphes.map((p) => p.num));
  // « En bref » de chaque paragraphe : public (il figure déjà en tête de chaque paragraphe verrouillé)
  const brefs = new Map((await Promise.all(chapitre.paragraphes.map((p) => getParagraphe(base.slug, p.num))))
    .filter(Boolean).map((p) => [p!.num, p!.enbref]));
  const figs = figures.filter((f) => nums.has(f.paragraphe));
  const mods = modeles.filter((m) => m.renvois.some((r) => nums.has(r)));
  const tous = sommaire.parties.flatMap((p) => p.chapitres.map((c) => c.code));
  const i = tous.indexOf(chapitre.code);

  return (
    <>
      <NavGuide base={base} actif="sommaire" />
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 22, alignItems: "start" }} className="lecteur-guide">
        <article className="document">
          <div className="fil"><Link href={`/${base.slug}`}>{base.titre}</Link> › Partie {partie.num} · {partie.titre}</div>
          <div className="entete-para"><span className="num">Chapitre {chapitre.code}</span><h1>{chapitre.titre}</h1></div>
          <div className="meta"><span>{chapitre.paragraphes.length} paragraphe{chapitre.paragraphes.length > 1 ? "s" : ""}</span>
            {!!figs.length && <span>· {figs.length} logigramme{figs.length > 1 ? "s" : ""}</span>}
            {!!mods.length && <span>· {mods.length} modèle{mods.length > 1 ? "s" : ""} d&apos;acte</span>}</div>
          <span className="etiquette">Dans ce chapitre</span>
          <div className="dans-chapitre">
            {chapitre.paragraphes.map((x) => (
              <section key={x.num}>
                <h2>
                  {acces.ok || x.gratuit
                    ? <Link href={`/${base.slug}/p/${x.num}`}><span className="num">n° {x.num}</span> {x.titre}</Link>
                    : <span className="verrou"><span className="num">n° {x.num}</span> {x.titre}</span>}
                </h2>
                {brefs.get(x.num) && <p>{brefs.get(x.num)}</p>}
                <div className="meta" style={{ margin: "4px 0 0" }}>
                  {x.maj && <span>Mis à jour le {dateFr(x.maj)}</span>}
                  {x.modifie && <span className="badge alerte">Modifié</span>}
                  {figs.filter((f) => f.paragraphe === x.num).map((f) => <span key={f.num} className="badge info">Figure {f.num}</span>)}
                </div>
              </section>
            ))}
            {!chapitre.paragraphes.length && <p className="muet">En cours de rédaction.</p>}
          </div>
          <div className="navigation-para">
            {i > 0 ? <Link className="btn secondaire petit" href={`/${base.slug}/chapitre/${tous[i - 1]}`}>‹ Chapitre {tous[i - 1]}</Link> : <span />}
            {i < tous.length - 1 && <Link className="btn secondaire petit" href={`/${base.slug}/chapitre/${tous[i + 1]}`}>Chapitre {tous[i + 1]} ›</Link>}
          </div>
        </article>
        <aside className="pile">
          {!!figs.length && (
            <div className="carte"><h2>Logigrammes</h2>
              <ul className="liste-maj">{figs.map((f) => (
                <li key={f.num}>{acces.ok ? <Link href={`/${base.slug}/p/${f.paragraphe}#figure-${f.num}`}>Figure {f.num} — {f.titre}</Link> : <span>Figure {f.num} — {f.titre}</span>}</li>
              ))}</ul>
            </div>
          )}
          {!!mods.length && (
            <div className="carte"><h2>Modèles d&apos;actes</h2>
              <ul className="liste-maj">{mods.map((m) => (
                <li key={m.code}>{acces.ok ? <Link href={`/${base.slug}/modeles/${m.code}`}><span className="num">{m.code}</span> {m.titre}</Link> : <span><span className="num">{m.code}</span> {m.titre}</span>}</li>
              ))}</ul>
            </div>
          )}
          <div className="carte"><h2>Partie {partie.num} — {partie.titre}</h2>
            <ul className="liste-maj">{partie.chapitres.map((c) => (
              <li key={c.code}>{c.code === chapitre.code ? <b>{c.code} {c.titre}</b> : <Link href={`/${base.slug}/chapitre/${c.code}`}>{c.code} {c.titre}</Link>}</li>
            ))}</ul>
          </div>
        </aside>
      </div>
    </>
  );
}
