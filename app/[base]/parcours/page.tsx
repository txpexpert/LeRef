import Link from "next/link";
import { notFound } from "next/navigation";
import { getBase, getParcours, getTitres } from "@/lib/contenu";
import { accesGuide } from "@/lib/session";
import NavGuide from "@/components/NavGuide";

export const metadata = { title: "Parcours par situation" };

export default async function Parcours({ params }: { params: { base: string } }) {
  const base = await getBase(params.base);
  if (!base) notFound();
  const [liste, acces] = await Promise.all([getParcours(base.slug), accesGuide(base.slug)]);
  const titres = await getTitres(base.slug, [...new Set(liste.flatMap((p) => p.etapes))]);
  return (
    <>
      <NavGuide base={base} actif="parcours" />
      <div className="titre-section">
        <h1 style={{ fontSize: "1.6rem" }}>Parcours par situation</h1>
        <span className="muet">Les paragraphes utiles, dans l&apos;ordre de l&apos;opération</span>
      </div>
      <div className="grille-3">
        {liste.map((p) => (
          <div key={p.id} className="carte" style={{ display: "grid", gap: 10, alignContent: "start" }}>
            {p.gratuit ? <span className="badge ok" style={{ justifySelf: "start" }}>Accès libre</span> : <span className="etiquette">Abonnés</span>}
            <h2 style={{ fontSize: "1.15rem", margin: 0 }}>{p.titre}</h2>
            {p.description && <p className="muet" style={{ margin: 0, fontSize: ".9rem" }}>{p.description}</p>}
            <ol className="etapes">
              {p.etapes.map((e) => (
                <li key={e}>
                  {(acces.ok || p.gratuit) && titres.has(e)
                    ? <Link href={`/${base.slug}/p/${e}`}><span className="num">n° {e}</span> {titres.get(e)}</Link>
                    : <span className="muet"><span className="num">n° {e}</span> {titres.get(e) ?? "en préparation"}</span>}
                </li>
              ))}
            </ol>
          </div>
        ))}
        <div className="carte muet" style={{ borderStyle: "dashed" }}>D&apos;autres parcours sont publiés au fur et à mesure de la rédaction du guide.</div>
      </div>
    </>
  );
}
