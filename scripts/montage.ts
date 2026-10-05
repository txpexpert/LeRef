// =====================================================================
// MONTAGE : contrôle du contenu d'un guide, rapport, chargement en base
// ---------------------------------------------------------------------
//   npm run montage:controle             contrôle seul, tous les guides
//   npm run montage -- douane            contrôle + chargement du guide « douane »
//   npm run montage -- douane --forcer   charge malgré des erreurs bloquantes
// Le rapport est écrit dans rapports/<guide>-<date>.md
// =====================================================================
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { lireBases, lireChapitres, lireLiminaires, lireLogigrammes, lireModeles, lireParcours, lirePlan, ordreDe, RACINE } from "./chargement";
import { normaliserReference } from "../lib/references";
import type { BaseConfig, Paragraphe } from "../lib/types";

const args = process.argv.slice(2);
const controleSeul = args.includes("--controle");
const forcer = args.includes("--forcer");
const ciblees = args.filter((a) => !a.startsWith("--"));

type Rapport = {
  base: string;
  date: string;
  paragraphes: number;
  prevus: number;
  erreurs: string[];
  avertissements: string[];
  aRediger: Record<string, string[]>;
  ajouts: string[];
  balises: { num: string; balise: string }[];
  ancienGabarit: string[];
  figures?: number;
  modeles?: number;
};

function chargerEnv() {
  for (const f of [".env.local", ".env"]) {
    const p = path.join(RACINE, f);
    if (!fs.existsSync(p)) continue;
    for (const l of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

function controler(cfg: BaseConfig) {
  const base = cfg.slug;
  const plan = lirePlan(base);
  const fichiers = lireChapitres(base);
  const r: Rapport = {
    base, date: new Date().toISOString().slice(0, 10), paragraphes: 0, prevus: plan.sections.size,
    erreurs: [], avertissements: [], aRediger: {}, ajouts: [], balises: [], ancienGabarit: [],
  };
  const chapitres = new Map(plan.chapitres.map((c) => [c.code, c]));
  const vus = new Map<string, string>();
  const valides: Paragraphe[] = [];

  for (const f of fichiers) {
    if (f.erreur) { r.erreurs.push(`${f.fichier} : ${f.erreur}`); continue; }
    for (const p of f.paragraphes!) {
      const ou = `${f.fichier} › ${p?.id ?? "(sans numéro)"}`;
      if (!p || typeof p.id !== "string" || !/^\d+-\d{3}$/.test(p.id)) { r.erreurs.push(`${ou} : numéro absent ou mal formé`); continue; }
      if (!p.t) { r.erreurs.push(`${ou} : titre absent`); continue; }
      if (vus.has(p.id)) { r.erreurs.push(`${p.id} : numéro en double (${vus.get(p.id)} et ${f.fichier})`); continue; }
      vus.set(p.id, f.fichier);
      const partie = Number(p.id.split("-")[0]);
      const ch = p.ch || plan.sections.get(p.id)?.chapitre || "";
      const chap = chapitres.get(ch);
      if (!chap) { r.erreurs.push(`${ou} : chapitre « ${ch || "?"} » inconnu du plan`); continue; }
      if (chap.partie !== partie) { r.erreurs.push(`${ou} : le numéro n'appartient pas à la partie du chapitre ${ch}`); continue; }
      if (ordreDe(p.id) < ordreDe(chap.debut) || ordreDe(p.id) > ordreDe(chap.fin)) {
        r.erreurs.push(`${ou} : hors de la plage du chapitre ${ch} (${chap.debut} à ${chap.fin})`); continue;
      }
      if (!plan.sections.has(p.id)) r.ajouts.push(`${p.id} ${p.t}`);
      for (const b of p.balises ?? []) r.balises.push({ num: p.id, balise: b });
      if (!p.enbref || !p.faq || !p.cas) r.ancienGabarit.push(p.id);
      valides.push({ ...p, ch, p: partie });
    }
  }

  const existants = new Set([...plan.sections.keys(), ...vus.keys()]);
  for (const p of valides)
    for (const rv of p.renvois ?? [])
      if (!existants.has(rv)) r.avertissements.push(`${p.id} : renvoi vers ${rv}, absent du plan et du contenu`);

  for (const [num, s] of plan.sections)
    if (!vus.has(num)) (r.aRediger[s.chapitre] ??= []).push(`${num} ${s.titre}`);

  const parcours = lireParcours(base);
  for (const pc of parcours)
    for (const e of pc.etapes)
      if (!vus.has(e)) r.avertissements.push(`Parcours « ${pc.titre} » : étape ${e} non rédigée`);
  for (const g of cfg.gratuits ?? [])
    if (!vus.has(g)) r.avertissements.push(`Paragraphe gratuit ${g} déclaré dans bases.json mais non rédigé`);

  // Annexes : logigrammes et modèles d'actes
  const liminaires = lireLiminaires(base);
  const logigrammes = lireLogigrammes(base);
  const modeles = lireModeles(base);
  const numsFig = new Set<number>();
  for (const f of logigrammes) {
    if (numsFig.has(f.num)) r.erreurs.push(`Figure ${f.num} : numéro en double dans logigrammes.json`);
    numsFig.add(f.num);
    if (!vus.has(f.paragraphe)) r.erreurs.push(`Figure ${f.num} : rattachée au n° ${f.paragraphe}, non rédigé`);
    if (!fs.existsSync(f.chemin)) r.erreurs.push(`Figure ${f.num} : image ${f.fichier} absente de content/${base}/figures/`);
  }
  const codes = new Set<string>();
  for (const m of modeles) {
    if (!/^M\d+$/.test(m.code) || codes.has(m.code)) r.erreurs.push(`Modèle ${m.code} : code absent, mal formé ou en double`);
    codes.add(m.code);
    if (!m.corps?.length) r.erreurs.push(`Modèle ${m.code} : corps du modèle vide`);
    for (const rv of m.renvois ?? []) if (!vus.has(rv)) r.avertissements.push(`Modèle ${m.code} : renvoi vers ${rv}, non rédigé`);
    for (const fg of m.figures ?? []) if (!numsFig.has(fg)) r.avertissements.push(`Modèle ${m.code} : renvoi vers la figure ${fg}, absente`);
  }
  r.figures = logigrammes.length;
  r.modeles = modeles.length;

  r.paragraphes = valides.length;
  return { r, plan, valides, parcours, liminaires, logigrammes, modeles };
}

function ecrireRapport(r: Rapport): string {
  const L: string[] = [];
  L.push(`# Rapport de montage — ${r.base} — ${r.date}`, "");
  L.push(`- Paragraphes valides : **${r.paragraphes}**`);
  L.push(`- Sections prévues au plan : ${r.prevus}`);
  L.push(`- Logigrammes : ${r.figures ?? 0} · Modèles d'actes : ${r.modeles ?? 0}`);
  L.push(`- Erreurs bloquantes : **${r.erreurs.length}**`);
  L.push(`- Avertissements : ${r.avertissements.length}`);
  L.push(`- Balises restant à trancher : ${r.balises.length}`);
  L.push(`- Paragraphes à l'ancien gabarit (sans en bref, cas pratique ou FAQ) : ${r.ancienGabarit.length}`, "");
  if (r.erreurs.length) L.push("## Erreurs bloquantes", "", ...r.erreurs.map((e) => `- ${e}`), "");
  if (r.avertissements.length) L.push("## Avertissements", "", ...r.avertissements.map((e) => `- ${e}`), "");
  if (r.balises.length) L.push("## Balises à trancher", "", ...r.balises.map((b) => `- **${b.num}** — ${b.balise}`), "");
  if (r.ajouts.length) L.push("## Paragraphes ajoutés hors plan (à reporter dans le plan)", "", ...r.ajouts.map((a) => `- ${a}`), "");
  if (r.ancienGabarit.length) L.push("## À enrichir (« Guide : enrichis »)", "", r.ancienGabarit.join(", "), "");
  const chap = Object.keys(r.aRediger);
  if (chap.length) {
    L.push("## Sections du plan non rédigées", "");
    for (const c of chap) L.push(`- **${c}** : ${r.aRediger[c].length} section(s) — ${r.aRediger[c].map((s) => s.split(" ")[0]).join(", ")}`);
    L.push("");
  }
  const fichier = path.join(RACINE, "rapports", `${r.base}-${r.date}.md`);
  fs.mkdirSync(path.dirname(fichier), { recursive: true });
  fs.writeFileSync(fichier, L.join("\n"));
  return fichier;
}

async function charger(cfg: BaseConfig, res: ReturnType<typeof controler>) {
  chargerEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !cle) throw new Error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis (fichier .env.local)");
  const db = createClient(url, cle, { auth: { persistSession: false } });
  const base = cfg.slug;
  const ok = (e: { message: string } | null, quoi: string) => { if (e) throw new Error(`${quoi} : ${e.message}`); };
  const gratuits = new Set(cfg.gratuits ?? []);

  ok((await db.from("bases").upsert({
    slug: base, titre: cfg.titre, sous_titre: cfg.sous_titre ?? null, description: cfg.description ?? null,
    ordre: cfg.ordre ?? 0, publie: cfg.publie ?? false, maj: new Date().toISOString(),
    edition: res.liminaires?.edition ?? null, a_jour_au: res.liminaires?.a_jour_au ?? null, liminaires: res.liminaires ?? null,
  })).error, "bases");

  ok((await db.from("parties").upsert(res.plan.parties.map((p) => ({ base, num: p.num, titre: p.titre })))).error, "parties");
  ok((await db.from("chapitres").upsert(res.plan.chapitres.map((c) => ({
    base, code: c.code, partie: c.partie, ordre: c.ordre, titre: c.titre, plage_debut: c.debut, plage_fin: c.fin,
  })))).error, "chapitres");

  const lignes = res.valides.map((p) => {
    const contenu: Paragraphe = { ...p };
    if (contenu.juris && /^n[ée]ant/i.test(contenu.juris.trim())) contenu.juris = "";
    return {
      base, num: p.id, partie: p.p, chapitre: p.ch, ordre: ordreDe(p.id), titre: p.t,
      enbref: p.enbref ?? null, contenu, maj: p.maj ?? null, verif: p.verif ?? null,
      modifie: !!p.mod, gratuit: gratuits.has(p.id), statut: "publie", importe_le: new Date().toISOString(),
    };
  });
  for (let i = 0; i < lignes.length; i += 100)
    ok((await db.from("paragraphes").upsert(lignes.slice(i, i + 100))).error, "paragraphes");

  // Les paragraphes retirés du dépôt sont retirés du site
  const presents = new Set(lignes.map((l) => l.num));
  const { data: enBase, error: e1 } = await db.from("paragraphes").select("num").eq("base", base);
  ok(e1, "lecture paragraphes");
  const aRetirer = (enBase ?? []).map((x) => x.num).filter((n) => !presents.has(n));
  if (aRetirer.length) ok((await db.from("paragraphes").delete().eq("base", base).in("num", aRetirer)).error, "retrait");

  // Citations et textes sources
  ok((await db.from("citations").delete().eq("base", base)).error, "citations (purge)");
  const citations = new Map<string, { base: string; num: string; ref: string; libelle: string }>();
  for (const p of res.valides)
    for (const t of p.textes ?? []) {
      const ref = normaliserReference(t);
      citations.set(`${p.id}|${ref}`, { base, num: p.id, ref, libelle: t });
    }
  const lc = [...citations.values()];
  for (let i = 0; i < lc.length; i += 200) ok((await db.from("citations").insert(lc.slice(i, i + 200))).error, "citations");
  const sources = new Map(lc.map((c) => [c.ref, { base, ref: c.ref, libelle: c.libelle }]));
  const ls = [...sources.values()];
  for (let i = 0; i < ls.length; i += 200)
    ok((await db.from("textes_sources").upsert(ls.slice(i, i + 200), { onConflict: "base,ref", ignoreDuplicates: true })).error, "textes_sources");

  ok((await db.from("parcours").delete().eq("base", base)).error, "parcours (purge)");
  if (res.parcours.length)
    ok((await db.from("parcours").insert(res.parcours.map((p, i) => ({
      base, id: p.id, titre: p.titre, description: p.description ?? null, etapes: p.etapes, gratuit: !!p.gratuit, ordre: i,
    })))).error, "parcours");

  // Logigrammes (images en base64, servies uniquement par le serveur du site) et modèles d'actes
  ok((await db.from("figures").delete().eq("base", base)).error, "figures (purge)");
  for (const f of res.logigrammes) {
    const ext = path.extname(f.fichier).toLowerCase();
    const mime = ext === ".png" ? "image/png" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".svg" ? "image/svg+xml" : "image/webp";
    ok((await db.from("figures").insert({
      base, num: f.num, titre: f.titre, sources: f.sources ?? null, paragraphe: f.paragraphe, mime,
      largeur: f.largeur ?? null, hauteur: f.hauteur ?? null, image: fs.readFileSync(f.chemin).toString("base64"),
    })).error, `figure ${f.num}`);
  }
  ok((await db.from("modeles").delete().eq("base", base)).error, "modèles (purge)");
  if (res.modeles.length)
    ok((await db.from("modeles").insert(res.modeles.map((m, i) => ({
      base, code: m.code, ordre: i, titre: m.titre, usage: m.usage ?? null, textes: m.textes ?? [], corps: m.corps,
      pieces: m.pieces ?? [], vigilance: m.vigilance ?? [], renvois: m.renvois ?? [], figures: m.figures ?? [],
    })))).error, "modèles");

  ok((await db.from("imports").insert({ base, paragraphes: lignes.length, rapport: res.r })).error, "imports");
  return { charges: lignes.length, retires: aRetirer.length, citations: lc.length, figures: res.logigrammes.length, modeles: res.modeles.length };
}

(async () => {
  const bases = lireBases().filter((b) => !ciblees.length || ciblees.includes(b.slug));
  if (!bases.length) { console.error("Aucun guide correspondant dans content/bases.json"); process.exit(1); }
  let echec = false;
  for (const cfg of bases) {
    const res = controler(cfg);
    const fichier = ecrireRapport(res.r);
    console.log(`\n■ ${cfg.titre} (${cfg.slug})`);
    console.log(`  ${res.r.paragraphes} paragraphes valides · ${res.r.erreurs.length} erreur(s) · ${res.r.avertissements.length} avertissement(s) · ${res.r.balises.length} balise(s)`);
    console.log(`  Rapport : ${path.relative(RACINE, fichier)}`);
    for (const e of res.r.erreurs.slice(0, 10)) console.log(`  ✗ ${e}`);
    if (controleSeul) { if (res.r.erreurs.length) echec = true; continue; }
    if (res.r.erreurs.length && !forcer) {
      console.log("  Chargement annulé : corrigez les erreurs bloquantes, ou relancez avec --forcer.");
      echec = true; continue;
    }
    try {
      const c = await charger(cfg, res);
      console.log(`  ✓ Chargé : ${c.charges} paragraphes, ${c.retires} retiré(s), ${c.citations} citations, ${c.figures} logigramme(s), ${c.modeles} modèle(s)`);
    } catch (e) {
      console.error(`  ✗ Chargement impossible : ${(e as Error).message}`);
      echec = true;
    }
  }
  process.exit(echec ? 1 : 0);
})();
