// =====================================================================
// MODE LOCAL : le site lit directement le dossier content/ (JSON, plan,
// logigrammes, modèles), sans Supabase. Il s'active automatiquement tant
// que NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY ne sont pas
// renseignés. Les comptes, abonnements, quotas et la facturation sont alors
// désactivés : tout le guide est lisible, pour relecture et démonstration.
// =====================================================================
import "server-only";
import fs from "node:fs";
import path from "node:path";
import { dbConfiguree } from "./supabase/admin";
import { normaliserReference } from "./references";
import { normaliserParagraphe, RE_FICHIER_CHAPITRE } from "./numeros";
import type { BaseConfig, Liminaires, Logigramme, ModeleActe, Paragraphe, Parcours } from "./types";

export const modeLocal = () => !dbConfiguree();

const CONTENU = path.join(process.cwd(), "content");

type Chapitre = { code: string; partie: number; ordre: number; titre: string; debut: string; fin: string };
type Guide = {
  cfg: BaseConfig;
  liminaires: Liminaires | null;
  parties: { num: number; titre: string }[];
  chapitres: Chapitre[];
  paragraphes: Paragraphe[];              // triés par numéro
  index: Map<string, Paragraphe>;
  parcours: Parcours[];
  figures: Logigramme[];
  modeles: ModeleActe[];
  citations: { num: string; ref: string; libelle: string }[];
};

export const ordreDe = (num: string) => { const [p, n] = num.split("-").map(Number); return p * 10000 + n; };

// Fichier « nom » ou « CODE_nom » (ex. « DOU_liminaires.json ») : les deux formes sont acceptées
function trouver(f: string): string {
  const dossier = path.dirname(f), nom = path.basename(f);
  if (fs.existsSync(f) || !fs.existsSync(dossier)) return f;
  const v = fs.readdirSync(dossier).find((x) => x.toLowerCase().endsWith("_" + nom.toLowerCase()) && /^[A-Za-z][A-Za-z0-9-]*_/.test(x));
  return v ? path.join(dossier, v) : f;
}

function lireJson<T>(f: string, defaut: T): T {
  f = trouver(f);
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : defaut;
}

// Signature des fichiers : le contenu est relu dès qu'un fichier change (utile en relecture)
function signature(): string {
  const parts: string[] = [];
  const parcourir = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) parcourir(p);
      else if (/\.(json|md)$/i.test(e.name)) parts.push(`${p}:${fs.statSync(p).mtimeMs}`);
    }
  };
  parcourir(CONTENU);
  return parts.join("|");
}

function lirePlan(dossier: string) {
  const fichier = fs.readdirSync(dossier).find((f) => /plan.*\.md$/i.test(f));
  const parties: Guide["parties"] = [], chapitres: Chapitre[] = [];
  if (!fichier) return { parties, chapitres };
  for (const l of fs.readFileSync(path.join(dossier, fichier), "utf8").split(/\r?\n/)) {
    const mp = l.match(/^##\s+Partie\s+(\d+)\s+[—–-]\s+(.+?)(?:\s+\(prioritaire\))?\s*$/i);
    if (mp) { parties.push({ num: +mp[1], titre: mp[2].trim() }); continue; }
    const mc = l.match(/^###\s+Chapitre\s+(\d+)\.(\d+)\s+[—–-]\s+(.+?)\s+\(plage\s+(?:[A-Za-z]+-)?(\d+-\d{3})\s+à\s+(?:[A-Za-z]+-)?(\d+-\d{3})\)/i);
    if (mc) chapitres.push({ code: `${mc[1]}.${mc[2]}`, partie: +mc[1], ordre: +mc[2], titre: mc[3].trim(), debut: mc[4], fin: mc[5] });
  }
  return { parties, chapitres };
}

function chargerGuide(cfg: BaseConfig): Guide {
  const dossier = path.join(CONTENU, cfg.slug);
  const { parties, chapitres } = lirePlan(dossier);
  const dChap = path.join(dossier, "chapitres");
  const paragraphes: Paragraphe[] = [];
  if (fs.existsSync(dChap))
    for (const f of fs.readdirSync(dChap).filter((x) => RE_FICHIER_CHAPITRE.test(x)).sort()) {
      try {
        const brut = JSON.parse(fs.readFileSync(path.join(dChap, f), "utf8"));
        if (Array.isArray(brut)) for (const b of brut as Paragraphe[]) if (b?.id && b.t) { const p = normaliserParagraphe(b); paragraphes.push({ ...p, p: Number(p.id.split("-")[0]) }); }
      } catch { /* fichier invalide : signalé par « npm run montage:controle » */ }
    }
  paragraphes.sort((a, b) => ordreDe(a.id) - ordreDe(b.id));
  const citations: Guide["citations"] = [];
  for (const p of paragraphes) {
    const vus = new Set<string>();
    for (const t of p.textes ?? []) {
      const ref = normaliserReference(t);
      if (!vus.has(ref)) { vus.add(ref); citations.push({ num: p.id, ref, libelle: t }); }
    }
  }
  return {
    cfg, parties, chapitres, paragraphes,
    index: new Map(paragraphes.map((p) => [p.id, p])),
    liminaires: lireJson<Liminaires | null>(path.join(dossier, "liminaires.json"), null),
    parcours: lireJson<Parcours[]>(path.join(dossier, "parcours.json"), []),
    figures: lireJson<Logigramme[]>(path.join(dossier, "logigrammes.json"), []),
    modeles: lireJson<ModeleActe[]>(path.join(dossier, "modeles.json"), []),
    citations,
  };
}

let cache: { sig: string; guides: Map<string, Guide> } | null = null;

export function guidesLocaux(): Map<string, Guide> {
  const sig = signature();
  if (!cache || cache.sig !== sig) {
    const bases = lireJson<BaseConfig[]>(path.join(CONTENU, "bases.json"), []);
    cache = { sig, guides: new Map(bases.filter((b) => b.publie).sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0)).map((b) => [b.slug, chargerGuide(b)])) };
  }
  return cache.guides;
}

export function guideLocal(slug: string): Guide | null {
  return guidesLocaux().get(slug) ?? null;
}

export function imageLocale(slug: string, num: number): { paragraphe: string; mime: string; data: Buffer } | null {
  const g = guideLocal(slug);
  const f = g?.figures.find((x) => x.num === num);
  if (!g || !f) return null;
  const chemin = trouver(path.join(CONTENU, slug, "figures", path.basename(f.fichier)));
  if (!fs.existsSync(chemin)) return null;
  const ext = path.extname(chemin).toLowerCase();
  const mime = ext === ".png" ? "image/png" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".svg" ? "image/svg+xml" : "image/webp";
  return { paragraphe: f.paragraphe, mime, data: fs.readFileSync(chemin) };
}

// ---------------------------------------------------------------------
// Recherche locale : insensible aux accents, titre > en bref > contenu
// ---------------------------------------------------------------------
const plat = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const MOTS_VIDES = new Set(["le", "la", "les", "de", "des", "du", "un", "une", "et", "en", "a", "au", "aux", "l", "d", "sur", "par", "pour", "dans"]);

export function rechercheLocale(slug: string, q: string) {
  const g = guideLocal(slug);
  if (!g) return [];
  const brut = q.trim();
  // Recherche directe par numéro (ex. 7-012)
  if (/^\d-\d{3}$/.test(brut) && g.index.has(brut)) {
    const p = g.index.get(brut)!;
    return [{ p, score: 1000, extrait: p.enbref ?? "" }];
  }
  const termes = plat(brut).replace(/\//g, " ").split(/[^a-z0-9-]+/).filter((t) => t && !MOTS_VIDES.has(t));
  if (!termes.length) return [];
  const res: { p: Paragraphe; score: number; extrait: string }[] = [];
  for (const p of g.paragraphes) {
    const titre = plat(`${p.id} ${p.t}`), bref = plat(p.enbref ?? "");
    const corpsBrut = [p.principe, p.admin, p.cas, p.conseil, ...(p.textes ?? []), ...(p.faq ?? []).flat()].filter(Boolean).join(" ");
    const corps = plat(corpsBrut).replace(/\//g, " ");
    let score = 0, tous = true;
    for (const t of termes) {
      const s = (titre.includes(t) ? 6 : 0) + (bref.includes(t) ? 3 : 0) + (corps.includes(t) ? 1 : 0);
      if (!s) tous = false;
      score += s;
    }
    if (!tous) continue;
    // Extrait de 30 mots autour de la première occurrence
    const source = `${p.enbref ?? ""} ${corpsBrut}`;
    const mots = source.split(/\s+/);
    const i = Math.max(0, mots.findIndex((m) => termes.some((t) => plat(m).includes(t))));
    const debut = Math.max(0, i - 10);
    res.push({ p, score, extrait: (debut ? "… " : "") + mots.slice(debut, debut + 30).join(" ") + " …" });
  }
  return res.sort((a, b) => b.score - a.score || ordreDe(a.p.id) - ordreDe(b.p.id));
}
