// Lectures du contenu, toujours côté serveur.
import "server-only";
import { db, dbConfiguree } from "./supabase/admin";
import type { Liminaires, Paragraphe } from "./types";
import { guideLocal, guidesLocaux, modeLocal, ordreDe, rechercheLocale } from "./local";

// En mode local (pas de Supabase), chaque lecture est servie depuis content/.
function baseLocale(slug: string): Base | null {
  const g = guideLocal(slug);
  if (!g) return null;
  return {
    slug: g.cfg.slug, titre: g.cfg.titre, sous_titre: g.cfg.sous_titre ?? null, description: g.cfg.description ?? null,
    ordre: g.cfg.ordre ?? 0, publie: true, maj: new Date().toISOString(),
    edition: g.liminaires?.edition ?? null, a_jour_au: g.liminaires?.a_jour_au ?? null, liminaires: g.liminaires,
  };
}

export type Base = {
  slug: string; titre: string; sous_titre: string | null; description: string | null; ordre: number; publie: boolean; maj: string;
  edition?: string | null; a_jour_au?: string | null; liminaires?: Liminaires | null;
};
export type LigneSommaire = { num: string; titre: string; chapitre: string; partie: number; gratuit: boolean; modifie: boolean; maj: string | null };
export type Sommaire = {
  parties: { num: number; titre: string; chapitres: { code: string; titre: string; paragraphes: LigneSommaire[] }[] }[];
  total: number;
};

export async function listeBases(): Promise<Base[]> {
  if (modeLocal()) return [...guidesLocaux().keys()].map((s) => baseLocale(s)!);
  if (!dbConfiguree()) return [];
  const { data } = await db().from("bases").select("*").eq("publie", true).order("ordre");
  return (data ?? []) as Base[];
}

export async function getBase(slug: string): Promise<Base | null> {
  if (modeLocal()) return baseLocale(slug);
  if (!dbConfiguree()) return null;
  const { data } = await db().from("bases").select("*").eq("slug", slug).eq("publie", true).maybeSingle();
  return data as Base | null;
}

// Le sommaire ne contient que des titres : il est public (utile au référencement).
export async function getSommaire(base: string): Promise<Sommaire> {
  if (modeLocal()) {
    const g = guideLocal(base);
    if (!g) return { parties: [], total: 0 };
    const gratuits = new Set(g.cfg.gratuits ?? []);
    const ligne = (p: Paragraphe): LigneSommaire => ({ num: p.id, titre: p.t, chapitre: p.ch, partie: p.p, gratuit: gratuits.has(p.id), modifie: !!p.mod, maj: p.maj ?? null });
    return {
      total: g.paragraphes.length,
      parties: g.parties.map((pt) => ({
        num: pt.num, titre: pt.titre,
        chapitres: g.chapitres.filter((c) => c.partie === pt.num)
          .map((c) => ({ code: c.code, titre: c.titre, paragraphes: g.paragraphes.filter((p) => p.ch === c.code).map(ligne) })),
      })),
    };
  }
  const [p, c, g] = await Promise.all([
    db().from("parties").select("num, titre").eq("base", base).order("num"),
    db().from("chapitres").select("code, titre, partie, ordre").eq("base", base).order("partie").order("ordre"),
    db().from("paragraphes").select("num, titre, chapitre, partie, gratuit, modifie, maj")
      .eq("base", base).eq("statut", "publie").order("ordre"),
  ]);
  const paras = (g.data ?? []) as LigneSommaire[];
  const parChapitre = new Map<string, LigneSommaire[]>();
  for (const x of paras) (parChapitre.get(x.chapitre) ?? parChapitre.set(x.chapitre, []).get(x.chapitre)!).push(x);
  return {
    total: paras.length,
    parties: (p.data ?? []).map((pt) => ({
      num: pt.num, titre: pt.titre,
      chapitres: (c.data ?? []).filter((ch) => ch.partie === pt.num)
        .map((ch) => ({ code: ch.code, titre: ch.titre, paragraphes: parChapitre.get(ch.code) ?? [] })),
    })),
  };
}

export type ParagrapheEnBase = {
  num: string; titre: string; chapitre: string; partie: number; enbref: string | null;
  contenu: Paragraphe; maj: string | null; verif: string | null; modifie: boolean; gratuit: boolean;
};

export async function getParagraphe(base: string, num: string): Promise<ParagrapheEnBase | null> {
  if (modeLocal()) {
    const g = guideLocal(base), p = g?.index.get(num);
    if (!g || !p) return null;
    const contenu = { ...p };
    if (contenu.juris && /^n[ée]ant/i.test(contenu.juris.trim())) contenu.juris = "";
    return { num: p.id, titre: p.t, chapitre: p.ch, partie: p.p, enbref: p.enbref ?? null, contenu, maj: p.maj ?? null,
      verif: p.verif ?? null, modifie: !!p.mod, gratuit: (g.cfg.gratuits ?? []).includes(p.id) };
  }
  const { data } = await db().from("paragraphes")
    .select("num, titre, chapitre, partie, enbref, contenu, maj, verif, modifie, gratuit")
    .eq("base", base).eq("num", num).eq("statut", "publie").maybeSingle();
  return data as ParagrapheEnBase | null;
}

// Titres seulement (renvois, voisins, étapes de parcours)
export async function getTitres(base: string, nums: string[]): Promise<Map<string, string>> {
  if (!nums.length) return new Map();
  if (modeLocal()) {
    const g = guideLocal(base);
    return new Map(nums.filter((n) => g?.index.has(n)).map((n) => [n, g!.index.get(n)!.t]));
  }
  const { data } = await db().from("paragraphes").select("num, titre").eq("base", base).in("num", nums);
  return new Map((data ?? []).map((x) => [x.num, x.titre]));
}

export async function getVoisins(base: string, num: string) {
  if (modeLocal()) {
    const liste = guideLocal(base)?.paragraphes ?? [];
    const i = liste.findIndex((p) => p.id === num);
    const v = (p?: Paragraphe) => (p ? { num: p.id, titre: p.t } : null);
    return { precedent: v(i > 0 ? liste[i - 1] : undefined), suivant: v(i >= 0 ? liste[i + 1] : undefined) };
  }
  const [pt, n] = num.split("-").map(Number);
  const ordre = pt * 10000 + n;
  const [a, b] = await Promise.all([
    db().from("paragraphes").select("num, titre").eq("base", base).eq("statut", "publie").lt("ordre", ordre).order("ordre", { ascending: false }).limit(1),
    db().from("paragraphes").select("num, titre").eq("base", base).eq("statut", "publie").gt("ordre", ordre).order("ordre").limit(1),
  ]);
  return { precedent: a.data?.[0] ?? null, suivant: b.data?.[0] ?? null };
}

export async function getDernieresMaj(base: string, nombre = 8) {
  if (modeLocal())
    return [...(guideLocal(base)?.paragraphes ?? [])].filter((p) => p.maj)
      .sort((a, b) => b.maj!.localeCompare(a.maj!) || ordreDe(a.id) - ordreDe(b.id)).slice(0, nombre)
      .map((p) => ({ num: p.id, titre: p.t, maj: p.maj!, modifie: !!p.mod }));
  const { data } = await db().from("paragraphes").select("num, titre, maj, modifie")
    .eq("base", base).eq("statut", "publie").not("maj", "is", null).order("maj", { ascending: false }).limit(nombre);
  return (data ?? []) as { num: string; titre: string; maj: string; modifie: boolean }[];
}

export async function getParcours(base: string) {
  if (modeLocal())
    return (guideLocal(base)?.parcours ?? []).map((p) => ({ id: p.id, titre: p.titre, description: p.description ?? null, etapes: p.etapes, gratuit: !!p.gratuit }));
  const { data } = await db().from("parcours").select("*").eq("base", base).order("ordre");
  return (data ?? []) as { id: string; titre: string; description: string | null; etapes: string[]; gratuit: boolean }[];
}

export async function rechercher(base: string, q: string, page = 1) {
  if (modeLocal()) {
    const tout = rechercheLocale(base, q);
    return {
      total: tout.length,
      resultats: tout.slice((page - 1) * 20, page * 20).map((r) => ({ num: r.p.id, titre: r.p.t, chapitre: r.p.ch, partie: r.p.p, extrait: r.extrait, total: tout.length })),
    };
  }
  const { data, error } = await db().rpc("rechercher", { p_base: base, p_q: q, p_limite: 20, p_decalage: (page - 1) * 20 });
  if (error) return { resultats: [], total: 0 };
  const r = (data ?? []) as { num: string; titre: string; chapitre: string; partie: number; extrait: string; total: number }[];
  return { resultats: r, total: r[0]?.total ? Number(r[0].total) : 0 };
}

export async function getTexteSource(base: string, ref: string) {
  if (modeLocal()) {
    const c = (guideLocal(base)?.citations ?? []).filter((x) => x.ref === ref);
    return { texte: c.length ? { ref, libelle: c[0].libelle, titre: null, date_texte: null, statut: "inconnu", texte: null } : null,
      citations: c.map((x) => ({ num: x.num, libelle: x.libelle })) };
  }
  const [t, c] = await Promise.all([
    db().from("textes_sources").select("*").eq("base", base).eq("ref", ref).maybeSingle(),
    db().from("citations").select("num, libelle").eq("base", base).eq("ref", ref).order("num"),
  ]);
  return { texte: t.data as { ref: string; libelle: string; titre: string | null; date_texte: string | null; statut: string; texte: string | null } | null, citations: c.data ?? [] };
}

// ---------------------------------------------------------------------
// Annexes : logigrammes et modèles d'actes
// ---------------------------------------------------------------------
export type FigureInfo = { num: number; titre: string; sources: string | null; paragraphe: string; largeur: number | null; hauteur: number | null };
export type ModeleInfo = { code: string; titre: string; usage: string | null; renvois: string[]; figures: number[] };
export type Modele = ModeleInfo & { textes: string[]; corps: string[]; pieces: string[]; vigilance: string[] };

const COLS_FIGURE = "num, titre, sources, paragraphe, largeur, hauteur";

// Métadonnées seulement (titres publics) ; l'image passe par getImageFigure.
const figureInfo = (f: { num: number; titre: string; sources?: string; paragraphe: string; largeur?: number; hauteur?: number }): FigureInfo =>
  ({ num: f.num, titre: f.titre, sources: f.sources ?? null, paragraphe: f.paragraphe, largeur: f.largeur ?? null, hauteur: f.hauteur ?? null });
const modeleInfo = (m: { code: string; titre: string; usage?: string; renvois?: string[]; figures?: number[] }): ModeleInfo =>
  ({ code: m.code, titre: m.titre, usage: m.usage ?? null, renvois: m.renvois ?? [], figures: m.figures ?? [] });

export async function listeFigures(base: string): Promise<FigureInfo[]> {
  if (modeLocal()) return (guideLocal(base)?.figures ?? []).map(figureInfo).sort((a, b) => a.num - b.num);
  const { data } = await db().from("figures").select(COLS_FIGURE).eq("base", base).order("num");
  return (data ?? []) as FigureInfo[];
}

export async function getFiguresDuParagraphe(base: string, num: string): Promise<FigureInfo[]> {
  if (modeLocal()) return (guideLocal(base)?.figures ?? []).filter((f) => f.paragraphe === num).map(figureInfo);
  const { data } = await db().from("figures").select(COLS_FIGURE).eq("base", base).eq("paragraphe", num).order("num");
  return (data ?? []) as FigureInfo[];
}

export async function getImageFigure(base: string, num: number) {
  const { data } = await db().from("figures").select("paragraphe, mime, image").eq("base", base).eq("num", num).maybeSingle();
  return data as { paragraphe: string; mime: string; image: string } | null;
}

export async function listeModeles(base: string): Promise<ModeleInfo[]> {
  if (modeLocal()) return (guideLocal(base)?.modeles ?? []).map(modeleInfo);
  const { data } = await db().from("modeles").select("code, titre, usage, renvois, figures").eq("base", base).order("ordre");
  return (data ?? []) as ModeleInfo[];
}

export async function getModele(base: string, code: string): Promise<Modele | null> {
  if (modeLocal()) {
    const m = guideLocal(base)?.modeles.find((x) => x.code === code);
    return m ? { ...modeleInfo(m), textes: m.textes ?? [], corps: m.corps, pieces: m.pieces ?? [], vigilance: m.vigilance ?? [] } : null;
  }
  const { data } = await db().from("modeles").select("code, titre, usage, renvois, figures, textes, corps, pieces, vigilance")
    .eq("base", base).eq("code", code).maybeSingle();
  return data as Modele | null;
}

// Modèles d'actes qui renvoient à un paragraphe donné
export async function getModelesDuParagraphe(base: string, num: string): Promise<ModeleInfo[]> {
  if (modeLocal()) return (guideLocal(base)?.modeles ?? []).filter((m) => m.renvois?.includes(num)).map(modeleInfo);
  const { data } = await db().from("modeles").select("code, titre, usage, renvois, figures").eq("base", base).contains("renvois", [num]).order("ordre");
  return (data ?? []) as ModeleInfo[];
}

// Table des textes cités : chaque texte normalisé, avec les paragraphes qui le citent
export async function getTableTextes(base: string) {
  const lignes: { ref: string; libelle: string; num: string }[] = [];
  if (modeLocal()) lignes.push(...(guideLocal(base)?.citations ?? []));
  else for (let de = 0; ; de += 1000) {
    const { data } = await db().from("citations").select("ref, libelle, num").eq("base", base).order("ref").order("num").range(de, de + 999);
    lignes.push(...((data ?? []) as typeof lignes));
    if (!data || data.length < 1000) break;
  }
  const parRef = new Map<string, { ref: string; libelle: string; nums: string[] }>();
  for (const l of lignes) {
    const e = parRef.get(l.ref) ?? parRef.set(l.ref, { ref: l.ref, libelle: l.libelle, nums: [] }).get(l.ref)!;
    if (l.libelle.length < e.libelle.length) e.libelle = l.libelle;   // libellé le plus court = le plus générique
    if (!e.nums.includes(l.num)) e.nums.push(l.num);
  }
  return [...parRef.values()];
}
