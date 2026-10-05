// Annexe : index des logigrammes et des modèles d'actes.
// Les titres sont publics ; les schémas et les modèles sont réservés aux abonnés.
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBase, getTitres, listeFigures, listeModeles } from "@/lib/contenu";
import { accesGuide } from "@/lib/session";
import NavGuide from "@/components/NavGuide";

export async function generateMetadata({ params }: { params: { base: string } }) {
  const b = await getBase(params.base);
  return b ? { title: `Logigrammes et modèles d'actes — ${b.titre}` } : {};
}

export default async function Annexes({ params }: { params: { base: string } }) {
  const base = await getBase(params.base);
  if (!base) notFound();
  const [figures, modeles, acces] = await Promise.all([listeFigures(base.slug), listeModeles(base.slug), accesGuide(base.slug)]);
  const titres = await getTitres(base.slug, [...new Set(figures.map((f) => f.paragraphe))]);
  return (
    <>
      <NavGuide base={base} actif="annexes" />
      <div className="titre-section">
        <h1 style={{ fontSize: "1.6rem" }}>Logigrammes et modèles d&apos;actes</h1>
        <span className="muet">{figures.length} logigrammes · {modeles.length} modèles d&apos;actes</span>
      </div>
      {!acces.ok && <p className="message info">Les intitulés sont consultables librement. Les schémas et les modèles sont réservés aux abonnés.</p>}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 22, alignItems: "start" }} className="lecteur-guide">
        <section className="carte">
          <h2>A. Logigrammes</h2>
          <p className="muet" style={{ marginTop: 0, fontSize: ".9rem" }}>Étapes, acteurs, délais et points de blocage des procédures clés. Chaque schéma figure dans le paragraphe qu&apos;il illustre.</p>
          <ol className="etapes">
            {figures.map((f) => (
              <li key={f.num}>
                <b>Figure {f.num}</b> — {f.titre}
                <div className="muet" style={{ fontSize: ".82rem" }}>
                  {acces.ok
                    ? <Link href={`/${base.slug}/p/${f.paragraphe}#figure-${f.num}`}>n° {f.paragraphe} {titres.get(f.paragraphe)}</Link>
                    : <span>n° {f.paragraphe} {titres.get(f.paragraphe)}</span>}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="carte">
          <h2>B. Modèles d&apos;actes</h2>
          <p className="muet" style={{ marginTop: 0, fontSize: ".9rem" }}>Modèles directement utilisables, conformes aux textes cités. Lorsque l&apos;administration impose un formulaire, celui-ci prévaut.</p>
          <div style={{ display: "grid", gap: 12 }}>
            {modeles.map((m) => (
              <div key={m.code} style={{ borderTop: "1px solid var(--filet)", paddingTop: 10 }}>
                {acces.ok
                  ? <Link href={`/${base.slug}/modeles/${m.code}`}><span className="num">{m.code}</span> {m.titre}</Link>
                  : <span><span className="num">{m.code}</span> {m.titre}</span>}
                {m.usage && <p className="muet" style={{ margin: "4px 0 0", fontSize: ".85rem" }}>{m.usage}</p>}
              </div>
            ))}
          </div>
          {!acces.ok && <div style={{ marginTop: 14 }}><Link className="btn" href="/inscription">Essai gratuit</Link></div>}
        </section>
      </div>
    </>
  );
}
