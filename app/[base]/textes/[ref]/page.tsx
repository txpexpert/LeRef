import Link from "next/link";
import { notFound } from "next/navigation";
import { getBase, getTexteSource, getTitres } from "@/lib/contenu";
import { accesGuide } from "@/lib/session";
import { dateFr } from "@/lib/format";
import NavGuide from "@/components/NavGuide";
import AccesRefuse from "@/components/AccesRefuse";
import Texte from "@/components/Texte";

export const dynamic = "force-dynamic";

export default async function TexteSource({ params }: { params: { base: string; ref: string } }) {
  const base = await getBase(params.base);
  if (!base) notFound();
  const acces = await accesGuide(base.slug);
  if (!acces.ok) return <><NavGuide base={base} actif="lecture" /><AccesRefuse raison={acces.raison === "autre_session" ? "anonyme" : acces.raison} retour={`/${base.slug}/textes/${params.ref}`} /></>;
  const { texte, citations } = await getTexteSource(base.slug, params.ref);
  if (!texte && !citations.length) notFound();
  const titres = await getTitres(base.slug, citations.map((c) => c.num));
  return (
    <>
      <NavGuide base={base} actif="lecture" />
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 340px", gap: 22, alignItems: "start" }} className="lecteur-guide">
        <article className="document">
          <span className="etiquette">Texte source</span>
          <h1 style={{ fontSize: "1.6rem", margin: "6px 0 10px" }}>{texte?.titre ?? texte?.libelle ?? citations[0]?.libelle}</h1>
          <div className="meta">
            {texte?.statut === "abroge" && <span className="badge alerte">Abrogé</span>}
            {texte?.statut === "en_vigueur" && texte.texte && <span className="badge ok">En vigueur</span>}
            {texte?.date_texte && <span>Du {dateFr(texte.date_texte)}</span>}
          </div>
          {texte?.texte
            ? <div className="corps" style={{ fontFamily: "var(--f-titre)", lineHeight: 1.7 }}><Texte valeur={texte.texte} /></div>
            : <p className="message info">Le texte intégral sera mis en ligne prochainement. Les paragraphes du guide qui le citent sont listés ci-contre.</p>}
        </article>
        <aside className="carte">
          <h2 style={{ fontSize: "1.05rem" }}>Paragraphes qui citent ce texte</h2>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8, fontSize: ".88rem" }}>
            {citations.map((c) => (
              <li key={c.num}>
                <Link href={`/${base.slug}/p/${c.num}`}><span className="num">n° {c.num}</span> {titres.get(c.num)}</Link>
                <div className="muet" style={{ fontSize: ".8rem" }}>{c.libelle}</div>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </>
  );
}
