// Numéros de paragraphe : « 7-012 » ou, au format préfixé des nouveaux guides,
// « DOU-7-012 » (code du guide + numéro). Le site stocke toujours le numéro
// sans préfixe ; le préfixe sert seulement à vérifier que le fichier appartient
// bien au guide dans lequel on l'importe.
import type { Paragraphe } from "./types";

const RE_NUM = /^(?:([A-Za-z][A-Za-z0-9]*)-)?(\d+-\d{3})$/;

// Fichiers de chapitre : PARTIE_7_CH1.json ou DOU_PARTIE_7_CH1.json
export const RE_FICHIER_CHAPITRE = /^(?:[A-Za-z][A-Za-z0-9]*_)?PARTIE_.*\.json$/i;

export function decouperNum(id: unknown): { code: string | null; num: string } | null {
  if (typeof id !== "string") return null;
  const m = id.trim().match(RE_NUM);
  return m ? { code: m[1] ?? null, num: m[2] } : null;
}

export const sansPrefixe = (id: string) => decouperNum(id)?.num ?? id;

export const ordreDe = (num: string) => { const [p, n] = num.split("-").map(Number); return p * 10000 + n; };

// Paragraphe tel que stocké : numéro et renvois sans préfixe
export function normaliserParagraphe(p: Paragraphe): Paragraphe {
  const id = sansPrefixe(p.id);
  return { ...p, id, ...(p.renvois ? { renvois: p.renvois.map(sansPrefixe) } : {}) };
}

// Fichiers : le nom peut commencer par le code du guide (« DOU_PARTIE_7_CH1.json »,
// « FISC_liminaires.json », « URB_figure-03.webp »). Ce code évite de déposer par erreur
// le fichier d'un guide dans un autre : l'import refuse un code différent du guide choisi.
export function decouperFichier(chemin: string): { code: string | null; nom: string } {
  const nom = chemin.split(/[\\/]/).pop() ?? chemin;
  const m = nom.match(/^([A-Za-z][A-Za-z0-9]*)_(.+)$/);
  if (!m || /^partie$/i.test(m[1])) return { code: null, nom };
  return { code: m[1].toUpperCase(), nom: m[2] };
}
