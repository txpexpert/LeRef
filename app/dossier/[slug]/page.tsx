import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getDossier } from "@/lib/dossiers";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const d = await getDossier(params.slug);
  return { title: d?.titre ?? "Dossier" };
}

export default async function PageDossier({ params }: { params: { slug: string } }) {
  const d = await getDossier(params.slug);
  if (!d) notFound();
  return (
    <>
      <div className="fil"><Link href="/">Accueil</Link> › {d.court}</div>
      <div className="dossier-page">
        {d.couverture && (
          <img className="dossier-couv" src={d.couverture} width={640} height={905} alt={`Couverture — ${d.titre}`} />
        )}
        <div>
          <span className="etiquette">Dossier</span>
          <h1 style={{ fontSize: "2rem", margin: "6px 0 16px" }}>{d.titre}</h1>
          {d.disponible ? (
            <div className="pile">
              {d.disponibles.map((b) => (
                <Link key={b.slug} className="guide-carte" href={`/${b.slug}`}>
                  <span className="etiquette">{b.sous_titre ?? "Guide"}</span>
                  <h3>{b.titre}</h3>
                  {b.description && <p className="muet" style={{ margin: 0 }}>{b.description}</p>}
                  <span className="btn secondaire petit" style={{ justifySelf: "start" }}>Consulter le sommaire</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="guide-carte a-venir">
              <span className="etiquette">Prochainement</span>
              <h3>Ce dossier est en préparation</h3>
              <p className="muet" style={{ margin: 0 }}>Le guide rejoindra la plateforme avec la même méthode : paragraphes numérotés, sources citées, mises à jour tracées.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
