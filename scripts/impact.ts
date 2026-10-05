// Analyse d'impact : quels paragraphes citent un texte donné ?
//   npm run impact -- "6538/313"
//   npm run impact -- "circulaire 6538/313" douane
import { lireBases, lireChapitres } from "./chargement";
import { normaliserReference } from "../lib/references";

const [recherche, baseCible] = process.argv.slice(2);
if (!recherche) {
  console.error('Usage : npm run impact -- "<référence du texte>" [guide]');
  process.exit(1);
}
const brut = recherche.toLowerCase().replace(/\s+/g, " ").trim();
const cle = normaliserReference(recherche);
let total = 0;

for (const b of lireBases().filter((x) => !baseCible || x.slug === baseCible)) {
  for (const f of lireChapitres(b.slug)) {
    for (const p of f.paragraphes ?? []) {
      const hits = (p.textes ?? []).filter((t) =>
        t.toLowerCase().includes(brut) || normaliserReference(t) === cle);
      if (hits.length) {
        total++;
        console.log(`${b.slug} · ${p.id} · ${p.t}`);
        console.log(`   fichier : content/${b.slug}/chapitres/${f.fichier}`);
        for (const h of hits) console.log(`   cite : ${h}`);
      }
    }
  }
}
console.log(total ? `\n${total} paragraphe(s) concerné(s).` : "Aucun paragraphe ne cite ce texte.");
