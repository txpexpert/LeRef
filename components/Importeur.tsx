"use client";
// Dépôt de fichiers pour l'import direct (Administration › Importer).
// Les fichiers texte partent en un seul envoi (contrôlés ensemble) ; les
// images suivent par lots de 3,5 Mo au plus (limite d'une requête Vercel).
import { useRef, useState } from "react";
import { importerFichiers } from "@/app/admin/importer/actions";
import type { ResultatImport, TypeFichier } from "@/lib/importation";

const LIBELLES: Record<TypeFichier, string> = {
  plan: "Plan", chapitre: "Chapitre", liminaires: "Liminaires", parcours: "Parcours", modeles: "Modèles d'actes",
  logigrammes: "Logigrammes", figure: "Image", bases: "Registre des guides", dossiers: "Dossiers (accueil)", inconnu: "Non reconnu",
};
const LOT = 3.5 * 1024 * 1024;

// Code du guide en tête du nom (« FISC_PARTIE_1_CH1.json ») ; « PARTIE_… » seul n'en a pas
function codeDe(nom: string): string | null {
  const m = nom.match(/^([A-Za-z][A-Za-z0-9]*)_(.+)$/);
  return m && !/^partie$/i.test(m[1]) && !/^(bases|dossiers)\.json$/i.test(nom) ? m[1].toUpperCase() : null;
}

function typeDe(brut: string): TypeFichier {
  if (/^(bases|dossiers)\.json$/i.test(brut)) return brut.toLowerCase().startsWith("bases") ? "bases" : "dossiers";
  const nom = codeDe(brut) ? brut.slice(brut.indexOf("_") + 1) : brut;
  if (/plan.*\.md$/i.test(nom)) return "plan";
  if (/^(?:[A-Za-z][A-Za-z0-9]*_)?PARTIE_.*\.json$/i.test(nom)) return "chapitre";
  if (/\.(webp|png|jpe?g|svg)$/i.test(nom)) return "figure";
  const m = nom.toLowerCase().match(/^(liminaires|parcours|modeles|logigrammes|bases|dossiers)\.json$/);
  return m ? (m[1] as TypeFichier) : "inconnu";
}

function fusionner(a: ResultatImport | null, b: ResultatImport): ResultatImport {
  if (!a) return b;
  return {
    ...b,
    fichiers: [...a.fichiers, ...b.fichiers], erreurs: [...a.erreurs, ...b.erreurs], avertissements: [...a.avertissements, ...b.avertissements],
    ajoutes: [...a.ajoutes, ...b.ajoutes], modifies: [...a.modifies, ...b.modifies], inchanges: a.inchanges + b.inchanges,
    absents: [...a.absents, ...b.absents], retires: [...a.retires, ...b.retires],
  };
}

export default function Importeur({ bases }: { bases: { slug: string; titre: string; publie: boolean; code: string | null }[] }) {
  const [base, setBase] = useState(bases[0]?.slug ?? "");
  const [fichiers, setFichiers] = useState<File[]>([]);
  const [retirer, setRetirer] = useState(false);
  const [survol, setSurvol] = useState(false);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [res, setRes] = useState<ResultatImport | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const champ = useRef<HTMLInputElement>(null);

  const ajouter = (liste: FileList | null) => {
    if (!liste) return;
    const nouveaux = [...liste].filter((f) => !f.name.startsWith(".") && !/^desktop\.ini$/i.test(f.name));
    setFichiers((av) => {
      const tous = [...av.filter((x) => !nouveaux.some((n) => n.name === x.name)), ...nouveaux];
      // Sélection automatique du guide d'après le code porté par les fichiers
      const codes = new Set(tous.map((f) => codeDe(f.name)).filter(Boolean));
      if (codes.size === 1) {
        const g = bases.find((b) => b.code?.toUpperCase() === [...codes][0]);
        if (g) setBase(g.slug);
      }
      return tous;
    });
    setRes(null); setErreur(null);
  };

  async function envoyer(simulation: boolean) {
    if (!fichiers.length || !base) return;
    setErreur(null); setRes(null);
    const textes = fichiers.filter((f) => typeDe(f.name) !== "figure");
    const images = fichiers.filter((f) => typeDe(f.name) === "figure");
    // Vérification : les images sont annoncées par leur nom seulement
    const lots: File[][] = [];
    if (simulation) lots.push([...textes, ...images.map((i) => new File([], i.name))]);
    else {
      let courant: File[] = [...textes], taille = textes.reduce((s, f) => s + f.size, 0);
      for (const im of images) {
        if (taille + im.size > LOT && courant.length) { lots.push(courant); courant = []; taille = 0; }
        courant.push(im); taille += im.size;
      }
      lots.push(courant);
    }
    let cumul: ResultatImport | null = null;
    for (let i = 0; i < lots.length; i++) {
      setEnCours(lots.length > 1 ? `Envoi ${i + 1} / ${lots.length}…` : simulation ? "Vérification…" : "Publication…");
      const fd = new FormData();
      fd.set("base", base); fd.set("simulation", simulation ? "1" : "0"); fd.set("retirer", retirer ? "1" : "0");
      for (const f of lots[i]) fd.append("fichiers", f, f.name);
      try {
        const r = await importerFichiers(fd);
        if ("erreur" in r) { setErreur(r.erreur); break; }
        cumul = fusionner(cumul, r);
        if (r.erreurs.length) break;   // on n'envoie pas la suite si un lot est refusé
      } catch (e) {
        setErreur(`Envoi impossible : ${(e as Error).message}. Fichiers trop volumineux ? Déposez-les en plusieurs fois.`);
        break;
      }
    }
    setRes(cumul); setEnCours(null);
    if (cumul && !simulation && !cumul.erreurs.length) setFichiers([]);
  }

  const publie = res && !res.simulation && !res.erreurs.length;
  return (
    <div className="carte pile">
      <label className="champ" htmlFor="imp-base">Guide concerné
        <select id="imp-base" value={base} onChange={(e) => { setBase(e.target.value); setRes(null); }}>
          {bases.map((b) => <option key={b.slug} value={b.slug}>{b.titre} ({b.slug}{b.code ? ` · ${b.code}` : ""}){b.publie ? "" : " — non publié"}</option>)}
          {!bases.length && <option value="">Aucun guide : déposez d&apos;abord bases.json</option>}
        </select>
        <small>Pour créer un nouveau guide, saisissez son slug ci-dessous et déposez bases.json (qui le déclare) avec son plan et ses chapitres.</small>
      </label>
      {!bases.some((b) => b.slug === base) && (
        <label className="champ" htmlFor="imp-slug">Slug du nouveau guide<input id="imp-slug" value={base} onChange={(e) => setBase(e.target.value.trim())} placeholder="ex. fiscal" /></label>
      )}
      {bases.length > 0 && bases.some((b) => b.slug === base) && (
        <button type="button" className="btn secondaire petit" style={{ justifySelf: "start" }} onClick={() => setBase("")}>Nouveau guide…</button>
      )}

      <div
        onDragOver={(e) => { e.preventDefault(); setSurvol(true); }}
        onDragLeave={() => setSurvol(false)}
        onDrop={(e) => { e.preventDefault(); setSurvol(false); ajouter(e.dataTransfer.files); }}
        onClick={() => champ.current?.click()}
        role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") champ.current?.click(); }}
        style={{
          border: `2px dashed ${survol ? "var(--marine)" : "var(--filet)"}`, borderRadius: "var(--r)", padding: "28px 16px",
          textAlign: "center", cursor: "pointer", background: survol ? "var(--marine-pale)" : "var(--surface-2)",
        }}>
        <b>Déposez ici les fichiers modifiés</b>
        <div className="muet" style={{ fontSize: ".86rem", marginTop: 4 }}>ou cliquez pour les choisir — .json, plan .md, images des logigrammes</div>
        <input ref={champ} type="file" multiple accept=".json,.md,.webp,.png,.jpg,.jpeg,.svg" hidden onChange={(e) => { ajouter(e.target.files); e.target.value = ""; }} />
      </div>

      {fichiers.length > 0 && (
        <div className="defile">
          <table className="tableau">
            <thead><tr><th>Fichier</th><th>Guide</th><th>Type</th><th className="chiffre">Taille</th><th></th></tr></thead>
            <tbody>
              {fichiers.map((f) => (
                <tr key={f.name}>
                  <td className="num">{f.name}</td>
                  <td>{(() => {
                    const c = codeDe(f.name), attendu = bases.find((b) => b.slug === base)?.code?.toUpperCase();
                    if (typeDe(f.name) === "bases" || typeDe(f.name) === "dossiers") return <span className="muet">commun</span>;
                    if (!c) return <span className="badge alerte">sans code</span>;
                    return <span className={`badge ${attendu && c !== attendu ? "alerte" : "ok"}`}>{c}</span>;
                  })()}</td>
                  <td><span className={`badge ${typeDe(f.name) === "inconnu" ? "alerte" : "neutre"}`}>{LIBELLES[typeDe(f.name)]}</span></td>
                  <td className="chiffre">{(f.size / 1024).toFixed(0)} Ko</td>
                  <td><button type="button" className="btn secondaire petit" onClick={() => setFichiers((l) => l.filter((x) => x !== f))}>Retirer</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: ".9rem" }}>
        <input type="checkbox" checked={retirer} onChange={(e) => setRetirer(e.target.checked)} style={{ marginTop: 3 }} />
        <span>Retirer du site les paragraphes d&apos;un chapitre déposé qui ne figurent plus dans son fichier <span className="muet">(ils restent archivés)</span></span>
      </label>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" className="btn secondaire" disabled={!fichiers.length || !base || !!enCours} onClick={() => envoyer(true)}>Vérifier sans publier</button>
        <button type="button" className="btn" disabled={!fichiers.length || !base || !!enCours} onClick={() => envoyer(false)}>Publier sur le site</button>
        {enCours && <span className="muet">{enCours}</span>}
      </div>

      {erreur && <div className="message erreur" role="alert">{erreur}</div>}
      {res && <Rapport r={res} base={base} publie={!!publie} />}
    </div>
  );
}

function Rapport({ r, base, publie }: { r: ResultatImport; base: string; publie: boolean }) {
  const lien = (s: string) => { const num = s.split(" ")[0]; return <li key={s}><a href={`/${base}/p/${num}`} target="_blank" rel="noreferrer">{num}</a> {s.slice(num.length)}</li>; };
  return (
    <div className="pile">
      {r.erreurs.length > 0
        ? <div className="message erreur">{r.erreurs.length} erreur(s) : rien n&apos;a été {r.simulation ? "vérifié comme publiable" : "publié"}. Corrigez les fichiers et redéposez-les.</div>
        : r.simulation
          ? <div className="message info">Contrôle réussi. Cliquez sur « Publier sur le site » pour appliquer ces changements.</div>
          : <div className="message ok">Publié. Les pages concernées affichent déjà la nouvelle version.</div>}
      <div className="chiffres">
        <div><span>Ajoutés</span><b>{r.ajoutes.length}</b></div>
        <div><span>Modifiés</span><b>{r.modifies.length}</b></div>
        <div><span>Inchangés</span><b>{r.inchanges}</b></div>
        <div><span>{r.retires.length ? (publie ? "Retirés" : "Seraient retirés") : "Absents des fichiers"}</span><b>{r.retires.length || r.absents.length}</b></div>
      </div>
      <div className="defile">
        <table className="tableau">
          <thead><tr><th>Fichier</th><th>Type</th><th>Résultat</th></tr></thead>
          <tbody>
            {r.fichiers.map((f, i) => (
              <tr key={i}><td className="num">{f.nom}</td><td>{LIBELLES[f.type]}</td>
                <td><span className={`badge ${f.statut === "ok" ? "ok" : "alerte"}`}>{f.statut === "ok" ? "OK" : "Refusé"}</span> {f.detail}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      {r.erreurs.length > 0 && <details open className="carte"><summary><b>Erreurs ({r.erreurs.length})</b></summary><ul style={{ fontSize: ".86rem" }}>{r.erreurs.map((e, i) => <li key={i}>{e}</li>)}</ul></details>}
      {r.modifies.length > 0 && <details open className="carte"><summary><b>Paragraphes modifiés ({r.modifies.length})</b></summary><ul style={{ fontSize: ".86rem" }}>{r.modifies.map(lien)}</ul></details>}
      {r.ajoutes.length > 0 && <details className="carte"><summary><b>Paragraphes ajoutés ({r.ajoutes.length})</b></summary><ul style={{ fontSize: ".86rem" }}>{r.ajoutes.map(lien)}</ul></details>}
      {r.absents.length > 0 && <details className="carte"><summary><b>En base mais absents des fichiers déposés ({r.absents.length})</b></summary><p style={{ fontSize: ".86rem" }}>{r.absents.join(", ")}</p></details>}
      {r.avertissements.length > 0 && <details className="carte"><summary><b>Avertissements ({r.avertissements.length})</b></summary><ul style={{ fontSize: ".86rem" }}>{r.avertissements.map((e, i) => <li key={i}>{e}</li>)}</ul></details>}
    </div>
  );
}
