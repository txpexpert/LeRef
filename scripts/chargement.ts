// Lecture du contenu d'un guide depuis le dépôt : plan, chapitres, parcours.
import fs from "node:fs";
import path from "node:path";
import { normaliserParagraphe, RE_FICHIER_CHAPITRE } from "../lib/numeros";
import type { BaseConfig, Liminaires, Logigramme, ModeleActe, Paragraphe, Parcours } from "../lib/types";

export const RACINE = path.resolve(__dirname, "..");
export const CONTENU = path.join(RACINE, "content");

export type Plan = {
  parties: { num: number; titre: string }[];
  chapitres: { code: string; partie: number; ordre: number; titre: string; debut: string; fin: string }[];
  sections: Map<string, { titre: string; chapitre: string }>;
};

export function lireBases(): BaseConfig[] {
  return JSON.parse(fs.readFileSync(path.join(CONTENU, "bases.json"), "utf8"));
}

export function lirePlan(base: string): Plan {
  const dossier = path.join(CONTENU, base);
  const fichier = fs.readdirSync(dossier).find((f) => /plan.*\.md$/i.test(f));
  if (!fichier) throw new Error(`Aucun fichier de plan (*PLAN*.md) dans content/${base}`);
  const lignes = fs.readFileSync(path.join(dossier, fichier), "utf8").split(/\r?\n/);
  const plan: Plan = { parties: [], chapitres: [], sections: new Map() };
  let chapitre = "";
  for (const l of lignes) {
    const mp = l.match(/^##\s+Partie\s+(\d+)\s+[—–-]\s+(.+?)(?:\s+\((?:prioritaire)\))?\s*$/i);
    if (mp) { plan.parties.push({ num: +mp[1], titre: mp[2].trim() }); continue; }
    const mc = l.match(/^###\s+Chapitre\s+(\d+)\.(\d+)\s+[—–-]\s+(.+?)\s+\(plage\s+(?:[A-Za-z]+-)?(\d+-\d{3})\s+à\s+(?:[A-Za-z]+-)?(\d+-\d{3})\)/i);
    if (mc) {
      chapitre = `${mc[1]}.${mc[2]}`;
      plan.chapitres.push({ code: chapitre, partie: +mc[1], ordre: +mc[2], titre: mc[3].trim(), debut: mc[4], fin: mc[5] });
      continue;
    }
    const ms = l.match(/^-\s+(?:[A-Za-z]+-)?(\d+-\d{3})\s+(.+)$/);
    if (ms && chapitre) plan.sections.set(ms[1], { titre: ms[2].trim(), chapitre });
  }
  return plan;
}

export type FichierChapitre = { fichier: string; paragraphes?: Paragraphe[]; erreur?: string };

export function lireChapitres(base: string): FichierChapitre[] {
  const dossier = path.join(CONTENU, base, "chapitres");
  if (!fs.existsSync(dossier)) return [];
  return fs.readdirSync(dossier)
    .filter((f) => RE_FICHIER_CHAPITRE.test(f))
    .sort()
    .map((fichier) => {
      try {
        const brut = JSON.parse(fs.readFileSync(path.join(dossier, fichier), "utf8"));
        if (!Array.isArray(brut)) return { fichier, erreur: "le fichier ne contient pas un tableau de paragraphes" };
        // Numéros préfixés (« DOU-7-012 ») ramenés au numéro du site (« 7-012 ») ; le préfixe brut est gardé pour le contrôle
        return { fichier, paragraphes: (brut as Paragraphe[]).map((p) => (p && typeof p.id === "string" ? { ...normaliserParagraphe(p), _id: p.id } : p)) as Paragraphe[] };
      } catch (e) {
        return { fichier, erreur: `JSON invalide : ${(e as Error).message}` };
      }
    });
}

export function lireParcours(base: string): Parcours[] {
  const f = path.join(CONTENU, base, "parcours.json");
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : [];
}

function lireJson<T>(base: string, nom: string, defaut: T): T {
  const f = path.join(CONTENU, base, nom);
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : defaut;
}

// Pages liminaires : édition, avertissement, mode d'emploi, abréviations (facultatif)
export function lireLiminaires(base: string): Liminaires | null {
  return lireJson<Liminaires | null>(base, "liminaires.json", null);
}

// Logigrammes : métadonnées + chemin de l'image dans content/<guide>/figures/
export function lireLogigrammes(base: string): (Logigramme & { chemin: string })[] {
  return lireJson<Logigramme[]>(base, "logigrammes.json", [])
    .map((f) => ({ ...f, chemin: path.join(CONTENU, base, "figures", f.fichier) }));
}

export function lireModeles(base: string): ModeleActe[] {
  return lireJson<ModeleActe[]>(base, "modeles.json", []);
}

export function ordreDe(num: string): number {
  const [p, n] = num.split("-").map(Number);
  return p * 10000 + n;
}
