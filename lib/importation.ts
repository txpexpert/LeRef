// =====================================================================
// IMPORT DIRECT : un ou plusieurs fichiers déposés → contrôle → base
// ---------------------------------------------------------------------
// Utilisé par Administration › Importer. Reprend les contrôles du montage
// (scripts/montage.ts) mais travaille fichier par fichier : on dépose
// seulement ce qui a changé, et seuls les paragraphes réellement modifiés
// sont réécrits (l'ancienne version est archivée par la base).
// Les pages du site étant rendues à chaque requête (force-dynamic), la
// modification est visible au rechargement suivant.
//
// Fichiers reconnus (par leur nom) :
//   PARTIE_7_CH1.json, DOU_PARTIE_7_CH1.json   chapitre (tableau de paragraphes)
//   00_PLAN_*.md                                 plan (parties, chapitres, plages)
//   liminaires.json, parcours.json, modeles.json, logigrammes.json
//   figure-NN.webp|png|jpg|svg                   image d'un logigramme
//   bases.json, dossiers.json                    registres communs à tous les guides
// =====================================================================
import { normaliserReference } from "./references";
import { decouperFichier, decouperNum, normaliserParagraphe, ordreDe, RE_FICHIER_CHAPITRE } from "./numeros";
import type { BaseConfig, Liminaires, Logigramme, ModeleActe, Paragraphe, Parcours } from "./types";

export type FichierRecu = { nom: string; texte?: string; octets?: Uint8Array };

export type TypeFichier =
  | "plan" | "chapitre" | "liminaires" | "parcours" | "modeles" | "logigrammes"
  | "figure" | "bases" | "dossiers" | "inconnu";

export type LigneFichier = { nom: string; type: TypeFichier; statut: "ok" | "erreur"; detail: string };

export type ResultatImport = {
  simulation: boolean;
  base: string;
  fichiers: LigneFichier[];
  erreurs: string[];
  avertissements: string[];
  ajoutes: string[];
  modifies: string[];
  inchanges: number;
  absents: string[];      // paragraphes en base, dans un chapitre importé, mais absents du fichier
  retires: string[];
};

export type ChapitrePlan = { code: string; partie: number; ordre: number; titre: string; debut: string; fin: string };
export type LigneParagraphe = {
  base: string; num: string; partie: number; chapitre: string; ordre: number; titre: string;
  enbref: string | null; contenu: Paragraphe; maj: string | null; verif: string | null;
  modifie: boolean; statut: "publie"; source: string; importe_le: string;
};
export type DossierDef = { slug: string; ordre: number; court: string; titre: string; couverture: string | null; guides: string[] };
export type FigureLigne = {
  base: string; num: number; titre: string; sources: string | null; paragraphe: string; fichier: string;
  mime: string; largeur: number | null; hauteur: number | null; image?: string;
};

// Accès à la base : implémenté avec Supabase (lib/importation-supabase.ts)
export interface Depot {
  guide(slug: string): Promise<{ slug: string; code: string | null } | null>;
  ecrireBases(lignes: Record<string, unknown>[]): Promise<void>;
  marquerGratuits(base: string, nums: string[]): Promise<void>;
  remplacerDossiers(lignes: DossierDef[]): Promise<void>;
  chapitres(base: string): Promise<ChapitrePlan[]>;
  ecrirePlan(base: string, parties: { num: number; titre: string }[], chapitres: ChapitrePlan[]): Promise<void>;
  numerosDuGuide(base: string): Promise<{ num: string; chapitre: string }[]>;
  contenus(base: string, nums: string[]): Promise<Map<string, { contenu: Paragraphe; titre: string }>>;
  ecrireParagraphes(lignes: LigneParagraphe[]): Promise<void>;
  retirerParagraphes(base: string, nums: string[]): Promise<void>;
  remplacerCitations(base: string, nums: string[], citations: { base: string; num: string; ref: string; libelle: string }[]): Promise<void>;
  ecrireLiminaires(base: string, l: Liminaires): Promise<void>;
  remplacerParcours(base: string, lignes: Record<string, unknown>[]): Promise<void>;
  remplacerModeles(base: string, lignes: Record<string, unknown>[]): Promise<void>;
  figures(base: string): Promise<{ num: number; fichier: string | null; image: boolean }[]>;
  remplacerFigures(base: string, lignes: FigureLigne[]): Promise<void>;
  imageFigure(base: string, fichier: string, mime: string, image: string): Promise<boolean>;
  journal(e: { base: string; paragraphes: number; rapport: unknown; fichiers: string[]; auteur: string | null }): Promise<void>;
}

const RE_IMAGE = /\.(webp|png|jpe?g|svg)$/i;
const ORDRE: TypeFichier[] = ["bases", "dossiers", "plan", "chapitre", "liminaires", "parcours", "modeles", "logigrammes", "figure", "inconnu"];

export function typeDe(nom: string): TypeFichier {
  const brut = nom.split(/[\\/]/).pop() ?? nom;
  if (/^(bases|dossiers)\.json$/i.test(brut)) return brut.toLowerCase().startsWith("bases") ? "bases" : "dossiers";
  const n = decouperFichier(brut).nom;
  if (/plan.*\.md$/i.test(n)) return "plan";
  if (RE_FICHIER_CHAPITRE.test(n)) return "chapitre";
  if (RE_IMAGE.test(n)) return "figure";
  const m = n.toLowerCase().match(/^(liminaires|parcours|modeles|logigrammes|bases|dossiers)\.json$/);
  return m ? (m[1] as TypeFichier) : "inconnu";
}

export function mimeDe(nom: string): string {
  const e = nom.toLowerCase().split(".").pop();
  return e === "png" ? "image/png" : e === "jpg" || e === "jpeg" ? "image/jpeg" : e === "svg" ? "image/svg+xml" : "image/webp";
}

export function analyserPlan(texte: string) {
  const parties: { num: number; titre: string }[] = [];
  const chapitres: ChapitrePlan[] = [];
  const sections = new Map<string, string>();
  let ch = "";
  for (const l of texte.split(/\r?\n/)) {
    const mp = l.match(/^##\s+Partie\s+(\d+)\s+[—–-]\s+(.+?)(?:\s+\((?:prioritaire)\))?\s*$/i);
    if (mp) { parties.push({ num: +mp[1], titre: mp[2].trim() }); continue; }
    const mc = l.match(/^###\s+Chapitre\s+(\d+)\.(\d+)\s+[—–-]\s+(.+?)\s+\(plage\s+(?:[A-Za-z]+-)?(\d+-\d{3})\s+à\s+(?:[A-Za-z]+-)?(\d+-\d{3})\)/i);
    if (mc) { ch = `${mc[1]}.${mc[2]}`; chapitres.push({ code: ch, partie: +mc[1], ordre: +mc[2], titre: mc[3].trim(), debut: mc[4], fin: mc[5] }); continue; }
    const ms = l.match(/^-\s+(?:[A-Za-z]+-)?(\d+-\d{3})\s+/);
    if (ms && ch) sections.set(ms[1], ch);
  }
  return { parties, chapitres, sections };
}

// Comparaison indépendante de l'ordre des clés (jsonb ne conserve pas l'ordre)
function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  if (v && typeof v === "object")
    return `{${Object.keys(v as object).sort().filter((k) => (v as Record<string, unknown>)[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${stable((v as Record<string, unknown>)[k])}`).join(",")}}`;
  return JSON.stringify(v);
}

function enBase64(o: Uint8Array): string {
  return Buffer.from(o).toString("base64");
}

export async function importer(depot: Depot, opts: {
  base: string; fichiers: FichierRecu[]; simulation: boolean; retirerAbsents?: boolean; auteur?: string | null;
}): Promise<ResultatImport> {
  const { base, simulation } = opts;
  const R: ResultatImport = { simulation, base, fichiers: [], erreurs: [], avertissements: [], ajoutes: [], modifies: [], inchanges: 0, absents: [], retires: [] };
  // Écritures différées : rien n'est écrit tant qu'une erreur subsiste dans l'un des fichiers
  const ecritures: (() => Promise<unknown>)[] = [];
  const ecrire = (fn: () => Promise<unknown>) => { if (!simulation) ecritures.push(fn); };
  const ligne = (nom: string, type: TypeFichier, statut: "ok" | "erreur", detail: string) => {
    R.fichiers.push({ nom, type, statut, detail });
    if (statut === "erreur") R.erreurs.push(`${nom} : ${detail}`);
  };
  const lire = <T,>(f: FichierRecu, type: TypeFichier): T | undefined => {
    try { return JSON.parse((f.texte ?? "").replace(/^﻿/, "")) as T; }
    catch (e) { ligne(f.nom, type, "erreur", `JSON invalide : ${(e as Error).message}`); return undefined; }
  };

  const recus = opts.fichiers.map((f) => ({ f, type: typeDe(f.nom) }))
    .sort((a, b) => ORDRE.indexOf(a.type) - ORDRE.indexOf(b.type) || a.f.nom.localeCompare(b.f.nom));
  // Images : nom sans le code du guide (« DOU_figure-08.webp » → « figure-08.webp »)
  let images = new Map(recus.filter((r) => r.type === "figure").map((r) => [decouperFichier(r.f.nom).nom, r.f]));
  const imagesUtilisees = new Set<string>();

  // ---------- Registres communs : bases.json, dossiers.json ----------
  let gratuitsAMarquer: string[] | null = null;
  let guideRecu: { slug: string; code: string | null } | null = null;   // guide décrit dans le bases.json déposé
  for (const { f, type } of recus.filter((r) => r.type === "bases" || r.type === "dossiers")) {
    const json = lire<unknown>(f, type);
    if (json === undefined) continue;
    if (!Array.isArray(json)) { ligne(f.nom, type, "erreur", "le fichier doit contenir un tableau"); continue; }
    if (type === "bases") {
      const cfgs = json as (BaseConfig & { code?: string })[];
      const mauvais = cfgs.filter((c) => !c?.slug || !c.titre || c.slug === "dossier");
      if (mauvais.length) { ligne(f.nom, type, "erreur", "chaque guide doit avoir un slug (autre que « dossier ») et un titre"); continue; }
      ecrire(() => depot.ecrireBases(cfgs.map((c) => ({
        slug: c.slug, titre: c.titre, sous_titre: c.sous_titre ?? null, description: c.description ?? null,
        ordre: c.ordre ?? 0, publie: c.publie ?? false, code: c.code ?? null, maj: new Date().toISOString(),
      }))));
      const cible = cfgs.find((c) => c.slug === base);
      if (cible) { gratuitsAMarquer = cible.gratuits ?? []; guideRecu = { slug: cible.slug, code: cible.code ?? null }; }
      ligne(f.nom, type, "ok", `${cfgs.length} guide(s) : ${cfgs.map((c) => `${c.slug}${c.publie ? "" : " (non publié)"}`).join(", ")}`);
    } else {
      const ds = json as DossierDef[];
      if (ds.some((d) => !d?.slug || !d.titre)) { ligne(f.nom, type, "erreur", "chaque dossier doit avoir un slug et un titre"); continue; }
      ecrire(() => depot.remplacerDossiers(ds.map((d, i) => ({
        slug: d.slug, ordre: d.ordre ?? i, court: d.court ?? d.titre, titre: d.titre, couverture: d.couverture ?? null, guides: d.guides ?? [],
      }))));
      ligne(f.nom, type, "ok", `${ds.length} dossier(s) sur la page d'accueil`);
    }
  }

  let reste = recus.filter((r) => r.type !== "bases" && r.type !== "dossiers");
  if (!reste.length) return finir();

  const guide = guideRecu ?? await depot.guide(base);
  if (!guide) {
    R.erreurs.push(`Guide « ${base} » inconnu : déposez d'abord bases.json avec ce guide.`);
    for (const { f, type } of reste) R.fichiers.push({ nom: f.nom, type, statut: "erreur", detail: "guide inconnu" });
    return finir();
  }
  const code = guide?.code ?? null;

  // ---------- Slug du guide en tête du nom des fichiers ----------
  // « fiscal_PARTIE_1_CH1.json » déposé dans le guide douane est refusé, de même qu'un fichier
  // sans slug : son nom (PARTIE_1_CH1.json, liminaires.json…) existe dans tous les guides.
  const accepte = (p: string) => p === base.toLowerCase() || (!!code && p === code.toLowerCase());
  reste = reste.filter(({ f, type }) => {
    const { prefixe, nom } = decouperFichier(f.nom);
    if (!prefixe) {
      ligne(f.nom, type, "erreur", `nom sans slug de guide : renommez-le « ${base}_${nom} » pour confirmer qu'il appartient au guide « ${base} »`); return false;
    }
    if (!accepte(prefixe)) {
      ligne(f.nom, type, "erreur", `ce fichier appartient au guide « ${prefixe} », pas au guide « ${base} » : choisissez le bon guide`); return false;
    }
    return true;
  });
  images = new Map([...images].filter(([, f]) => reste.some((r) => r.f === f)));

  // ---------- Plan ----------
  let chapitres = await depot.chapitres(base);
  let sectionsPlan = new Map<string, string>();
  for (const { f } of reste.filter((r) => r.type === "plan")) {
    const plan = analyserPlan(f.texte ?? "");
    if (!plan.chapitres.length) { ligne(f.nom, "plan", "erreur", "aucun chapitre reconnu (format : ### Chapitre 1.1 — Titre (plage 1-001 à 1-009))"); continue; }
    const orphelins = plan.chapitres.filter((c) => !plan.parties.some((p) => p.num === c.partie));
    if (orphelins.length) { ligne(f.nom, "plan", "erreur", `chapitre(s) sans partie : ${orphelins.map((c) => c.code).join(", ")}`); continue; }
    const supprimes = chapitres.filter((c) => !plan.chapitres.some((n) => n.code === c.code));
    if (supprimes.length) R.avertissements.push(`Plan : chapitre(s) en base absents du nouveau plan, conservés : ${supprimes.map((c) => c.code).join(", ")}`);
    ecrire(() => depot.ecrirePlan(base, plan.parties, plan.chapitres));
    chapitres = [...plan.chapitres, ...supprimes];
    sectionsPlan = plan.sections;
    ligne(f.nom, "plan", "ok", `${plan.parties.length} parties, ${plan.chapitres.length} chapitres, ${plan.sections.size} sections`);
  }
  const parCode = new Map(chapitres.map((c) => [c.code, c]));

  // ---------- Chapitres (paragraphes) ----------
  const valides: { p: Paragraphe; fichier: string }[] = [];
  const vus = new Map<string, string>();
  for (const { f } of reste.filter((r) => r.type === "chapitre")) {
    const json = lire<unknown>(f, "chapitre");
    if (json === undefined) continue;
    if (!Array.isArray(json)) { ligne(f.nom, "chapitre", "erreur", "le fichier ne contient pas un tableau de paragraphes"); continue; }
    const erreursAvant = R.erreurs.length;
    let n = 0;
    for (const brut of json as Paragraphe[]) {
      const ou = `${f.nom} › ${brut?.id ?? "(sans numéro)"}`;
      const d = decouperNum(brut?.id);
      if (!d) { R.erreurs.push(`${ou} : numéro absent ou mal formé`); continue; }
      if (d.code && code && d.code.toUpperCase() !== code.toUpperCase()) { R.erreurs.push(`${ou} : préfixe ${d.code} différent du code du guide (${code})`); continue; }
      if (d.code && !code) R.avertissements.push(`${ou} : préfixe ${d.code} accepté (aucun code défini pour le guide dans bases.json)`);
      if (!brut.t) { R.erreurs.push(`${ou} : titre absent`); continue; }
      const p = normaliserParagraphe(brut);
      if (vus.has(p.id)) { R.erreurs.push(`${p.id} : numéro en double (${vus.get(p.id)} et ${f.nom})`); continue; }
      vus.set(p.id, f.nom);
      const partie = Number(p.id.split("-")[0]);
      const ch = p.ch || sectionsPlan.get(p.id) || "";
      const chap = parCode.get(ch);
      if (!chap) { R.erreurs.push(`${ou} : chapitre « ${ch || "?"} » inconnu du plan (déposez le plan avec le chapitre)`); continue; }
      if (chap.partie !== partie) { R.erreurs.push(`${ou} : le numéro n'appartient pas à la partie du chapitre ${ch}`); continue; }
      if (ordreDe(p.id) < ordreDe(chap.debut) || ordreDe(p.id) > ordreDe(chap.fin)) { R.erreurs.push(`${ou} : hors de la plage du chapitre ${ch} (${chap.debut} à ${chap.fin})`); continue; }
      for (const b of p.balises ?? []) R.avertissements.push(`${p.id} : balise à trancher — ${b}`);
      valides.push({ p: { ...p, ch, p: partie }, fichier: f.nom });
      n++;
    }
    const nErr = R.erreurs.length - erreursAvant;
    R.fichiers.push({ nom: f.nom, type: "chapitre", statut: nErr ? "erreur" : "ok", detail: `${n} paragraphe(s) valide(s)${nErr ? `, ${nErr} rejeté(s)` : ""}` });
  }

  if (valides.length) {
    const existants = await depot.contenus(base, valides.map((v) => v.p.id));
    const tous = await depot.numerosDuGuide(base);
    const connus = new Set([...tous.map((t) => t.num), ...vus.keys(), ...sectionsPlan.keys()]);
    const lignes: LigneParagraphe[] = [];
    const maintenant = new Date().toISOString();
    for (const { p, fichier } of valides) {
      const contenu: Paragraphe = { ...p };
      if (contenu.juris && /^n[ée]ant/i.test(contenu.juris.trim())) contenu.juris = "";
      for (const rv of p.renvois ?? []) if (!connus.has(rv)) R.avertissements.push(`${p.id} : renvoi vers ${rv}, absent du guide`);
      const avant = existants.get(p.id);
      if (avant && avant.titre === p.t && stable(avant.contenu) === stable(contenu)) { R.inchanges++; continue; }
      (avant ? R.modifies : R.ajoutes).push(`${p.id} ${p.t}`);
      lignes.push({
        base, num: p.id, partie: p.p, chapitre: p.ch, ordre: ordreDe(p.id), titre: p.t, enbref: p.enbref ?? null,
        contenu, maj: p.maj ?? null, verif: p.verif ?? null, modifie: !!p.mod, statut: "publie", source: fichier, importe_le: maintenant,
      });
    }
    // Paragraphes en base, rattachés aux chapitres importés, absents des fichiers déposés
    const chImportes = new Set(valides.map((v) => v.p.ch));
    R.absents = tous.filter((t) => chImportes.has(t.chapitre) && !vus.has(t.num)).map((t) => t.num).sort((a, b) => ordreDe(a) - ordreDe(b));

    {
      for (let i = 0; i < lignes.length; i += 100) { const lot = lignes.slice(i, i + 100); ecrire(() => depot.ecrireParagraphes(lot)); }
      const touches = lignes.map((l) => l.num);
      const citations = new Map<string, { base: string; num: string; ref: string; libelle: string }>();
      for (const l of lignes) for (const t of l.contenu.textes ?? []) {
        const ref = normaliserReference(t);
        citations.set(`${l.num}|${ref}`, { base, num: l.num, ref, libelle: t });
      }
      if (touches.length) ecrire(() => depot.remplacerCitations(base, touches, [...citations.values()]));
      if (opts.retirerAbsents && R.absents.length) { const a = [...R.absents]; ecrire(() => depot.retirerParagraphes(base, a)); R.retires = a; }
    }
  }

  // ---------- Liminaires ----------
  for (const { f } of reste.filter((r) => r.type === "liminaires")) {
    const l = lire<Liminaires>(f, "liminaires");
    if (!l) continue;
    if (Array.isArray(l) || typeof l !== "object") { ligne(f.nom, "liminaires", "erreur", "objet attendu"); continue; }
    if (l.a_jour_au && !/^\d{4}-\d{2}-\d{2}$/.test(l.a_jour_au)) { ligne(f.nom, "liminaires", "erreur", "a_jour_au doit être au format AAAA-MM-JJ"); continue; }
    ecrire(() => depot.ecrireLiminaires(base, l));
    ligne(f.nom, "liminaires", "ok", `${l.edition ?? "édition non précisée"}, à jour au ${l.a_jour_au ?? "?"}`);
  }

  // Numéros disponibles après import (pour les renvois des annexes)
  const numsApres = async () => {
    const s = new Set([...(await depot.numerosDuGuide(base)).map((t) => t.num), ...vus.keys()]);
    for (const r of R.retires) s.delete(r);
    return s;
  };

  // ---------- Parcours ----------
  for (const { f } of reste.filter((r) => r.type === "parcours")) {
    const ps = lire<Parcours[]>(f, "parcours");
    if (!ps) continue;
    if (!Array.isArray(ps) || ps.some((p) => !p?.id || !p.titre || !Array.isArray(p.etapes))) { ligne(f.nom, "parcours", "erreur", "chaque parcours doit avoir id, titre et etapes"); continue; }
    const nums = await numsApres();
    for (const pc of ps) for (const e of pc.etapes) if (!nums.has(decouperNum(e)?.num ?? e)) R.avertissements.push(`Parcours « ${pc.titre} » : étape ${e} non rédigée`);
    ecrire(() => depot.remplacerParcours(base, ps.map((p, i) => ({
      base, id: p.id, titre: p.titre, description: p.description ?? null, etapes: p.etapes.map((e) => decouperNum(e)?.num ?? e), gratuit: !!p.gratuit, ordre: i,
    }))));
    ligne(f.nom, "parcours", "ok", `${ps.length} parcours`);
  }

  // ---------- Modèles d'actes ----------
  for (const { f } of reste.filter((r) => r.type === "modeles")) {
    const ms = lire<ModeleActe[]>(f, "modeles");
    if (!ms) continue;
    if (!Array.isArray(ms)) { ligne(f.nom, "modeles", "erreur", "tableau attendu"); continue; }
    const codes = new Set<string>(); let ko = false;
    for (const m of ms) {
      if (!/^M\d+$/.test(m?.code ?? "") || codes.has(m.code)) { ko = true; R.erreurs.push(`${f.nom} › ${m?.code ?? "?"} : code absent, mal formé ou en double`); }
      else if (!m.corps?.length) { ko = true; R.erreurs.push(`${f.nom} › ${m.code} : corps du modèle vide`); }
      codes.add(m?.code);
    }
    if (ko) { R.fichiers.push({ nom: f.nom, type: "modeles", statut: "erreur", detail: "modèle(s) invalide(s)" }); continue; }
    const nums = await numsApres();
    for (const m of ms) for (const rv of m.renvois ?? []) if (!nums.has(decouperNum(rv)?.num ?? rv)) R.avertissements.push(`Modèle ${m.code} : renvoi vers ${rv}, non rédigé`);
    ecrire(() => depot.remplacerModeles(base, ms.map((m, i) => ({
      base, code: m.code, ordre: i, titre: m.titre, usage: m.usage ?? null, textes: m.textes ?? [], corps: m.corps,
      pieces: m.pieces ?? [], vigilance: m.vigilance ?? [], renvois: (m.renvois ?? []).map((r) => decouperNum(r)?.num ?? r), figures: m.figures ?? [],
    }))));
    ligne(f.nom, "modeles", "ok", `${ms.length} modèle(s) d'actes`);
  }

  // ---------- Logigrammes (métadonnées + images déposées avec) ----------
  for (const { f } of reste.filter((r) => r.type === "logigrammes")) {
    const ls = lire<Logigramme[]>(f, "logigrammes");
    if (!ls) continue;
    if (!Array.isArray(ls)) { ligne(f.nom, "logigrammes", "erreur", "tableau attendu"); continue; }
    const nums = await numsApres();
    const enBase = new Map((await depot.figures(base)).map((x) => [x.num, x]));
    const vusFig = new Set<number>(); let ko = false;
    const lignes: FigureLigne[] = [];
    for (const g of ls) {
      const para = decouperNum(g?.paragraphe)?.num;
      if (!Number.isInteger(g?.num) || vusFig.has(g.num)) { ko = true; R.erreurs.push(`${f.nom} › figure ${g?.num ?? "?"} : numéro absent ou en double`); continue; }
      vusFig.add(g.num);
      if (!g.titre || !g.fichier) { ko = true; R.erreurs.push(`${f.nom} › figure ${g.num} : titre ou fichier absent`); continue; }
      if (!para || !nums.has(para)) { ko = true; R.erreurs.push(`${f.nom} › figure ${g.num} : rattachée au n° ${g.paragraphe}, non rédigé`); continue; }
      const fichier = decouperFichier(g.fichier).nom;
      const img = images.get(fichier);
      if (img) imagesUtilisees.add(fichier);
      else if (!enBase.get(g.num)?.image) R.avertissements.push(`Figure ${g.num} : image ${fichier} à déposer`);
      lignes.push({
        base, num: g.num, titre: g.titre, sources: g.sources ?? null, paragraphe: para, fichier, mime: mimeDe(fichier),
        largeur: g.largeur ?? null, hauteur: g.hauteur ?? null, ...(img?.octets?.length ? { image: enBase64(img.octets) } : {}),
      });
    }
    if (ko) { R.fichiers.push({ nom: f.nom, type: "logigrammes", statut: "erreur", detail: "logigramme(s) invalide(s)" }); continue; }
    ecrire(() => depot.remplacerFigures(base, lignes));
    ligne(f.nom, "logigrammes", "ok", `${lignes.length} logigramme(s)`);
  }

  // ---------- Images seules (remplacement d'un logigramme existant) ----------
  for (const [nom, f] of images) {
    if (imagesUtilisees.has(nom)) { ligne(f.nom, "figure", "ok", "image du logigramme déclaré dans logigrammes.json"); continue; }
    const cible = (await depot.figures(base)).find((x) => x.fichier === nom);
    if (!cible) { ligne(f.nom, "figure", "erreur", "aucun logigramme de ce guide ne porte ce nom de fichier (déposez aussi logigrammes.json)"); continue; }
    if (!simulation && !f.octets?.length) { ligne(f.nom, "figure", "erreur", "fichier vide"); continue; }
    if (f.octets?.length) { const b64 = enBase64(f.octets); ecrire(() => depot.imageFigure(base, nom, mimeDe(nom), b64)); }
    ligne(f.nom, "figure", "ok", `remplace l'image de la figure ${cible.num}`);
  }

  for (const { f } of reste.filter((r) => r.type === "inconnu"))
    ligne(f.nom, "inconnu", "erreur", "type de fichier non reconnu (nom attendu : PARTIE_N_CHC.json, 00_PLAN_*.md, liminaires.json, parcours.json, modeles.json, logigrammes.json, figure-NN.webp, bases.json, dossiers.json)");

  return finir();

  async function finir(): Promise<ResultatImport> {
    if (!simulation && R.erreurs.length) R.retires = [];
    if (!simulation && !R.erreurs.length) {
      for (const e of ecritures) await e();
      if (gratuitsAMarquer) await depot.marquerGratuits(base, gratuitsAMarquer.map((g) => decouperNum(g)?.num ?? g));
      const total = (await depot.numerosDuGuide(base)).length;
      await depot.journal({
        base, paragraphes: total, fichiers: opts.fichiers.map((f) => f.nom), auteur: opts.auteur ?? null,
        rapport: { ...R, prevus: null, balises: R.avertissements.filter((a) => a.includes("balise")), ancienGabarit: [] },
      });
    }
    return R;
  }
}
