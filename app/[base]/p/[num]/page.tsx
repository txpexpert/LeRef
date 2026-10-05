import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getBase, getFiguresDuParagraphe, getModelesDuParagraphe, getParagraphe, getSommaire, getTitres, getVoisins } from "@/lib/contenu";
import { accesGuide, contexte, enregistrerLecture } from "@/lib/session";
import { db } from "@/lib/supabase/admin";
import { codeUtilisateur, filigraner } from "@/lib/filigrane";
import { normaliserReference } from "@/lib/references";
import { ipClient, agentClient } from "@/lib/requete";
import { dateFr, dateLongue } from "@/lib/format";
import { SITE } from "@/lib/config";
import { modeLocal } from "@/lib/local";
import NavGuide from "@/components/NavGuide";
import AccesRefuse from "@/components/AccesRefuse";
import Texte from "@/components/Texte";
import Filigrane from "@/components/Filigrane";
import ProtectionCopie from "@/components/ProtectionCopie";
import { basculerFavori, basculerSuivi } from "./actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { base: string; num: string } }) {
  return { title: `n° ${params.num}`, robots: { index: false, follow: false } };
}

const VERIF = { oui: ["ok", "Sources vérifiées"], partiel: ["partiel", "Vérification partielle"], non: ["alerte", "Sources à vérifier"] } as const;

export default async function Lecture({ params }: { params: { base: string; num: string } }) {
  const base = await getBase(params.base);
  if (!base) notFound();
  const para = await getParagraphe(base.slug, params.num);
  if (!para) notFound();
  const retour = `/${base.slug}/p/${para.num}`;

  const c = await contexte();
  if (c.etat === "autre_session") redirect("/deconnexion?raison=session");
  const acces = await accesGuide(base.slug);
  const lisible = acces.ok || para.gratuit;

  // Contrôle du quota et journalisation
  let limite = false;
  if (lisible && c.etat === "connecte" && !c.profil.est_admin) {
    const r = await enregistrerLecture(c.profil.id, base.slug, para.num, acces.ok ? acces.plan : null, ipClient(), agentClient());
    limite = !r.autorise;
  }

  const p = para.contenu;
  const [sommaire, voisins, titresRenvois, figures, modeles, etat] = await Promise.all([
    getSommaire(base.slug),
    getVoisins(base.slug, para.num),
    getTitres(base.slug, p.renvois ?? []),
    getFiguresDuParagraphe(base.slug, para.num),
    getModelesDuParagraphe(base.slug, para.num),
    c.etat === "connecte"
      ? Promise.all([
          db().from("favoris").select("num").match({ user_id: c.profil.id, base: base.slug, num: para.num }).maybeSingle(),
          db().from("suivis").select("num").match({ user_id: c.profil.id, base: base.slug, num: para.num }).maybeSingle(),
        ])
      : Promise.resolve(null),
  ]);
  const favori = !!etat?.[0].data, suivi = !!etat?.[1].data;
  const modelesAcces = acces.ok;   // les modèles d'actes restent réservés aux abonnés
  const partie = sommaire.parties.find((x) => x.num === para.partie);
  const chapitre = partie?.chapitres.find((x) => x.code === para.chapitre);

  const abonne = modeLocal() ? "Version locale de relecture" : c.etat === "connecte" ? `${c.profil.nom || c.profil.email}${c.organisation ? " · " + c.organisation.raison_sociale : ""}` : "visiteur";
  const code = c.etat === "connecte" ? codeUtilisateur(c.profil.id) : "00000000";
  const marque = (t?: string) => filigraner(t, code);
  const juris = p.juris && !/^n[ée]ant/i.test(p.juris.trim()) ? p.juris : "";
  const verif = para.verif ? VERIF[para.verif as keyof typeof VERIF] : null;

  return (
    <>
      <NavGuide base={base} actif="lecture" />
      <div className="lecteur">
        <aside aria-label="Sommaire">
          <nav className="toc">
            <p className="etiquette" style={{ margin: "0 0 6px" }}>Sommaire</p>
            {sommaire.parties.filter((x) => x.chapitres.some((ch) => ch.paragraphes.length)).map((pt) => (
              <details key={pt.num} open={pt.num === para.partie}>
                <summary><span className="num" style={{ color: "var(--laiton)" }}>{pt.num}</span> {pt.titre}</summary>
                {pt.chapitres.filter((ch) => ch.paragraphes.length).map((ch) => (
                  <div key={ch.code}>
                    <Link className="chap" href={`/${base.slug}/chapitre/${ch.code}`}>{ch.code} {ch.titre}</Link>
                    {ch.paragraphes.map((x) => (
                      <Link key={x.num} href={`/${base.slug}/p/${x.num}`} aria-current={x.num === para.num ? "page" : undefined}>
                        <span className="num">{x.num}</span><span>{x.titre}</span>
                      </Link>
                    ))}
                  </div>
                ))}
              </details>
            ))}
          </nav>
        </aside>

        <article className="document">
          {lisible && !limite && <Filigrane texte={`${abonne} · ${dateFr(new Date())}`} />}
          <div className="fil">
            <Link href={`/${base.slug}`}>{base.titre}</Link> › Partie {para.partie} · {partie?.titre} › <Link href={`/${base.slug}/chapitre/${para.chapitre}`}>{chapitre?.titre}</Link>
          </div>
          <div className="entete-para"><span className="num">n° {para.num}</span><h1>{para.titre}</h1></div>
          <div className="meta">
            {verif && <span className={`badge ${verif[0]}`}>{verif[1]}</span>}
            {para.modifie && <span className="badge alerte">Modifié récemment</span>}
            {para.gratuit && <span className="badge ok">Accès libre</span>}
            {para.maj && <span>Mis à jour le {dateFr(para.maj)}</span>}
          </div>

          {!lisible ? (
            <>
              {para.enbref && <div className="enbref"><span className="etiquette">En bref</span><p>{para.enbref}</p></div>}
              <AccesRefuse raison={(acces as { raison: "anonyme" }).raison} retour={retour} />
            </>
          ) : limite ? (
            <div className="message erreur" style={{ padding: 18 }}>
              <b>Limite de consultation atteinte.</b> Votre formule permet {acces.ok && acces.plan ? `${acces.plan.quota_heure} paragraphes par heure et ${acces.plan.quota_jour} par jour` : "un nombre limité de paragraphes"}.
              Les paragraphes déjà consultés aujourd&apos;hui restent accessibles. Pour un usage plus intensif, contactez-nous : {SITE.contact}.
            </div>
          ) : (
            <>
              <ProtectionCopie source={`${base.titre}, n° ${para.num}`} abonne={abonne} max={SITE.copieMax} />
              {p.enbref && <div className="enbref"><span className="etiquette">En bref</span><p>{marque(p.enbref)}</p></div>}
              {!!p.textes?.length && (
                <div className="bloc textes"><span className="etiquette">Texte applicable</span>
                  <ul>{p.textes.map((t) => <li key={t}><Link href={`/${base.slug}/textes/${normaliserReference(t)}`}>{t}</Link></li>)}</ul>
                </div>
              )}
              {p.principe && <div className="bloc"><span className="etiquette">Principe</span><div className="corps"><Texte valeur={marque(p.principe)} /></div></div>}
              {p.admin && <div className="bloc"><span className="etiquette">Position de l&apos;administration</span><div className="corps"><Texte valeur={p.admin} /></div></div>}
              {!!p.donnees?.length && (
                <div className="bloc"><span className="etiquette">Données clés</span>
                  <div className="defile" style={{ border: 0 }}>
                    <table className="donnees"><tbody>{p.donnees.map(([k, v], i) => <tr key={i}><th>{k}</th><td>{v}</td></tr>)}</tbody></table>
                  </div>
                </div>
              )}
              {p.cas && <div className="bloc cas"><span className="etiquette">Cas pratique</span><div className="corps"><Texte valeur={marque(p.cas)} /></div></div>}
              {juris && <div className="bloc"><span className="etiquette">Jurisprudence</span><div className="corps"><Texte valeur={juris} /></div></div>}
              {p.conseil && <div className="bloc conseil"><span className="etiquette">Conseil pratique</span><div className="corps"><Texte valeur={marque(p.conseil)} /></div></div>}
              {!!p.faq?.length && (
                <div className="bloc"><span className="etiquette">Questions fréquentes</span>
                  <div className="faq">{p.faq.map(([q, r], i) => <details key={i}><summary>{q}</summary><p>{r}</p></details>)}</div>
                </div>
              )}
              {figures.map((f) => (
                <figure key={f.num} id={`figure-${f.num}`} className="bloc logigramme">
                  <span className="etiquette">Logigramme</span>
                  <div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <a href={`/${base.slug}/figures/${f.num}`} target="_blank" rel="noopener" title="Agrandir le logigramme">
                      <img src={`/${base.slug}/figures/${f.num}`} alt={`Figure ${f.num} — ${f.titre}`} loading="lazy"
                        width={f.largeur ?? undefined} height={f.hauteur ?? undefined} draggable={false} />
                    </a>
                    <figcaption><b>Figure {f.num} —</b> {f.titre}.{f.sources && <span className="muet"> Sources : {f.sources}.</span>}</figcaption>
                  </div>
                </figure>
              ))}
              {!!modeles.length && (
                <div className="bloc"><span className="etiquette">Modèle d&apos;acte</span>
                  <div className="puces">{modeles.map((m) => modelesAcces
                    ? <Link key={m.code} className="puce" href={`/${base.slug}/modeles/${m.code}`}><span className="num">{m.code}</span> {m.titre}</Link>
                    : <span key={m.code} className="puce muet" title="Réservé aux abonnés"><span className="num">{m.code}</span> {m.titre}</span>)}
                  </div>
                </div>
              )}
              {!!p.renvois?.length && (
                <div className="bloc"><span className="etiquette">Voir aussi</span>
                  <div className="puces">{p.renvois.map((r) => titresRenvois.has(r)
                    ? <Link key={r} className="puce" href={`/${base.slug}/p/${r}`}><span className="num">n° {r}</span> {titresRenvois.get(r)}</Link>
                    : <span key={r} className="puce muet"><span className="num">n° {r}</span> en préparation</span>)}
                  </div>
                </div>
              )}
              {c.etat === "connecte" && c.profil.est_admin && !!p.balises?.length && (
                <div className="balises"><b>Balises à trancher (visible des administrateurs seulement)</b>
                  <ul>{p.balises.map((b, i) => <li key={i}>{b}</li>)}</ul>
                </div>
              )}
              <p className="consulte-par">Consulté par {abonne} le {dateLongue(new Date())}. Reproduction et diffusion interdites.</p>
            </>
          )}

          <div className="navigation-para">
            {voisins.precedent ? <Link className="btn secondaire petit" href={`/${base.slug}/p/${voisins.precedent.num}`}>‹ n° {voisins.precedent.num}</Link> : <span />}
            {voisins.suivant && <Link className="btn secondaire petit" href={`/${base.slug}/p/${voisins.suivant.num}`}>n° {voisins.suivant.num} ›</Link>}
          </div>
        </article>

        <aside className="droite outils" aria-label="Outils">
          {c.etat === "connecte" && lisible && (
            <div className="carte">
              <h2>Mon suivi</h2>
              <div style={{ display: "grid", gap: 8 }}>
                <form action={basculerSuivi.bind(null, base.slug, para.num)}>
                  <button className={`btn petit ${suivi ? "" : "secondaire"}`} type="submit" style={{ width: "100%" }}>
                    {suivi ? "Suivi activé : alerte en cas de modification" : "Suivre ce paragraphe"}
                  </button>
                </form>
                <form action={basculerFavori.bind(null, base.slug, para.num)}>
                  <button className={`btn petit ${favori ? "" : "secondaire"}`} type="submit" style={{ width: "100%" }}>
                    {favori ? "Dans mes favoris" : "Ajouter aux favoris"}
                  </button>
                </form>
              </div>
            </div>
          )}
          {lisible && !limite && !!p.hist?.length && (
            <div className="carte">
              <h2>Historique des versions</h2>
              <ul>{p.hist.map((h, i) => <li key={i} className="muet">{h}</li>)}</ul>
            </div>
          )}
          {c.etat === "connecte" && lisible && !limite && (
            <div className="carte">
              <h2>Protection active</h2>
              <ul className="muet">
                <li>Filigrane visible à votre nom</li>
                <li>Empreinte invisible propre à votre compte</li>
                <li>Copie limitée à {SITE.copieMax.toLocaleString("fr-FR")} caractères, source ajoutée</li>
              </ul>
            </div>
          )}
          <div className="carte">
            <h2>Dans ce chapitre</h2>
            <ul>
              {chapitre?.paragraphes.map((x) => (
                <li key={x.num}>
                  {x.num === para.num ? <b><span className="num">{x.num}</span> {x.titre}</b>
                    : <Link href={`/${base.slug}/p/${x.num}`} style={{ textDecoration: "none" }}><span className="num">{x.num}</span> {x.titre}</Link>}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
