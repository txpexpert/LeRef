// Modèle d'acte : réservé aux abonnés, filigrané, imprimable.
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getBase, getModele, getTitres, listeFigures } from "@/lib/contenu";
import { accesGuide, contexte } from "@/lib/session";
import { normaliserReference } from "@/lib/references";
import { dateFr, dateLongue } from "@/lib/format";
import { SITE } from "@/lib/config";
import { modeLocal } from "@/lib/local";
import NavGuide from "@/components/NavGuide";
import AccesRefuse from "@/components/AccesRefuse";
import Filigrane from "@/components/Filigrane";
import ProtectionCopie from "@/components/ProtectionCopie";
import BoutonImprimer from "@/components/BoutonImprimer";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { base: string; code: string } }) {
  return { title: `Modèle ${params.code}`, robots: { index: false, follow: false } };
}

export default async function PageModele({ params }: { params: { base: string; code: string } }) {
  const base = await getBase(params.base);
  if (!base) notFound();
  const code = params.code.toUpperCase();
  const retour = `/${base.slug}/modeles/${code}`;
  const c = await contexte();
  if (c.etat === "autre_session") redirect("/deconnexion?raison=session");
  const acces = await accesGuide(base.slug);
  if (!acces.ok) return <><NavGuide base={base} actif="annexes" /><AccesRefuse raison={acces.raison === "autre_session" ? "anonyme" : acces.raison} retour={retour} /></>;

  const m = await getModele(base.slug, code);
  if (!m) notFound();
  const [titres, figures] = await Promise.all([getTitres(base.slug, m.renvois), listeFigures(base.slug)]);
  const figuresLiees = figures.filter((f) => m.figures.includes(f.num));
  const abonne = modeLocal() ? "Version locale de relecture" : c.etat === "connecte" ? `${c.profil.nom || c.profil.email}${c.organisation ? " · " + c.organisation.raison_sociale : ""}` : "";

  return (
    <>
      <NavGuide base={base} actif="annexes" />
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 22, alignItems: "start" }} className="lecteur-guide">
        <article className="document">
          <Filigrane texte={`${abonne} · ${dateFr(new Date())}`} />
          <ProtectionCopie source={`${base.titre}, modèle ${m.code}`} abonne={abonne} max={SITE.copieMax} />
          <div className="fil"><Link href={`/${base.slug}/annexes`}>Logigrammes et modèles d&apos;actes</Link> › Modèle {m.code}</div>
          <div className="entete-para"><span className="num">Modèle {m.code}</span><h1>{m.titre}</h1></div>
          <div className="meta"><span className="badge info">Modèle d&apos;acte</span><span>À compléter : les pointillés signalent les mentions à renseigner</span></div>

          {m.usage && <div className="enbref"><span className="etiquette">Usage</span><p>{m.usage}</p></div>}
          {!!m.textes.length && (
            <div className="bloc textes"><span className="etiquette">Textes applicables</span>
              <ul>{m.textes.map((t) => <li key={t}><Link href={`/${base.slug}/textes/${normaliserReference(t)}`}>{t}</Link></li>)}</ul>
            </div>
          )}
          <div className="bloc"><span className="etiquette">Modèle</span>
            <div className="modele-acte">{m.corps.map((x, i) => <p key={i}>{x}</p>)}</div>
          </div>
          {!!m.pieces.length && (
            <div className="bloc"><span className="etiquette">Pièces à joindre</span>
              <div className="corps"><ul>{m.pieces.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
            </div>
          )}
          {!!m.vigilance.length && (
            <div className="bloc conseil"><span className="etiquette">Points de vigilance</span>
              <div className="corps"><ul>{m.vigilance.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
            </div>
          )}
          {(!!m.renvois.length || !!figuresLiees.length) && (
            <div className="bloc"><span className="etiquette">Voir aussi</span>
              <div className="puces">
                {m.renvois.map((r) => <Link key={r} className="puce" href={`/${base.slug}/p/${r}`}><span className="num">n° {r}</span> {titres.get(r)}</Link>)}
                {figuresLiees.map((f) => <Link key={f.num} className="puce" href={`/${base.slug}/p/${f.paragraphe}#figure-${f.num}`}><span className="num">Figure {f.num}</span> {f.titre}</Link>)}
              </div>
            </div>
          )}
          <p className="consulte-par">Consulté par {abonne} le {dateLongue(new Date())}. Usage interne de l&apos;abonné ; diffusion interdite.</p>
        </article>
        <aside className="pile outils">
          <div className="carte">
            <h2>Utiliser ce modèle</h2>
            <p className="muet" style={{ marginTop: 0, fontSize: ".88rem" }}>Imprimez-le ou enregistrez-le en PDF, puis complétez les mentions en pointillés. Si l&apos;administration impose un formulaire, ce formulaire prévaut.</p>
            <BoutonImprimer />
          </div>
        </aside>
      </div>
    </>
  );
}
