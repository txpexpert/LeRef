// Accès à Supabase pour l'import direct (clé secrète, serveur uniquement).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChapitrePlan, Depot } from "./importation";
import type { Paragraphe } from "./types";

export function depotSupabase(db: SupabaseClient): Depot {
  const ok = <T,>(r: { error: { message: string } | null; data?: unknown }, quoi: string): T => {
    if (r.error) throw new Error(`${quoi} : ${r.error.message}`);
    return r.data as T;
  };
  return {
    async guide(slug) {
      return ok<{ slug: string; code: string | null } | null>(await db.from("bases").select("slug, code").eq("slug", slug).maybeSingle(), "guide");
    },
    async ecrireBases(lignes) { ok(await db.from("bases").upsert(lignes), "bases"); },
    async marquerGratuits(base, nums) {
      ok(await db.from("paragraphes").update({ gratuit: false }).eq("base", base).eq("gratuit", true), "gratuits");
      if (nums.length) ok(await db.from("paragraphes").update({ gratuit: true }).eq("base", base).in("num", nums), "gratuits");
    },
    async remplacerDossiers(lignes) {
      ok(await db.from("dossiers").upsert(lignes), "dossiers");
      const garder = lignes.map((l) => l.slug);
      ok(await db.from("dossiers").delete().not("slug", "in", `(${garder.map((s) => `"${s}"`).join(",")})`), "dossiers (purge)");
    },
    async chapitres(base) {
      const d = ok<{ code: string; partie: number; ordre: number; titre: string; plage_debut: string; plage_fin: string }[]>(
        await db.from("chapitres").select("code, partie, ordre, titre, plage_debut, plage_fin").eq("base", base), "chapitres");
      return (d ?? []).map((c): ChapitrePlan => ({ code: c.code, partie: c.partie, ordre: c.ordre, titre: c.titre, debut: c.plage_debut, fin: c.plage_fin }));
    },
    async ecrirePlan(base, parties, chapitres) {
      ok(await db.from("parties").upsert(parties.map((p) => ({ base, num: p.num, titre: p.titre }))), "parties");
      ok(await db.from("chapitres").upsert(chapitres.map((c) => ({
        base, code: c.code, partie: c.partie, ordre: c.ordre, titre: c.titre, plage_debut: c.debut, plage_fin: c.fin,
      }))), "chapitres");
    },
    async numerosDuGuide(base) {
      const tout: { num: string; chapitre: string }[] = [];
      for (let de = 0; ; de += 1000) {
        const d = ok<{ num: string; chapitre: string }[]>(await db.from("paragraphes").select("num, chapitre").eq("base", base).range(de, de + 999), "numéros");
        tout.push(...(d ?? []));
        if (!d || d.length < 1000) return tout;
      }
    },
    async contenus(base, nums) {
      const m = new Map<string, { contenu: Paragraphe; titre: string }>();
      for (let i = 0; i < nums.length; i += 200) {
        const d = ok<{ num: string; titre: string; contenu: Paragraphe }[]>(
          await db.from("paragraphes").select("num, titre, contenu").eq("base", base).in("num", nums.slice(i, i + 200)), "contenus");
        for (const x of d ?? []) m.set(x.num, { contenu: x.contenu, titre: x.titre });
      }
      return m;
    },
    async ecrireParagraphes(lignes) { ok(await db.from("paragraphes").upsert(lignes), "paragraphes"); },
    async retirerParagraphes(base, nums) { ok(await db.from("paragraphes").delete().eq("base", base).in("num", nums), "retrait"); },
    async remplacerCitations(base, nums, citations) {
      for (let i = 0; i < nums.length; i += 200)
        ok(await db.from("citations").delete().eq("base", base).in("num", nums.slice(i, i + 200)), "citations (purge)");
      for (let i = 0; i < citations.length; i += 200)
        ok(await db.from("citations").insert(citations.slice(i, i + 200)), "citations");
      const sources = [...new Map(citations.map((c) => [c.ref, { base, ref: c.ref, libelle: c.libelle }])).values()];
      for (let i = 0; i < sources.length; i += 200)
        ok(await db.from("textes_sources").upsert(sources.slice(i, i + 200), { onConflict: "base,ref", ignoreDuplicates: true }), "textes_sources");
    },
    async ecrireLiminaires(base, l) {
      ok(await db.from("bases").update({ edition: l.edition ?? null, a_jour_au: l.a_jour_au ?? null, liminaires: l, maj: new Date().toISOString() }).eq("slug", base), "liminaires");
    },
    async remplacerParcours(base, lignes) {
      ok(await db.from("parcours").delete().eq("base", base), "parcours (purge)");
      if (lignes.length) ok(await db.from("parcours").insert(lignes), "parcours");
    },
    async remplacerModeles(base, lignes) {
      ok(await db.from("modeles").delete().eq("base", base), "modèles (purge)");
      if (lignes.length) ok(await db.from("modeles").insert(lignes), "modèles");
    },
    async figures(base) {
      const d = ok<{ num: number; fichier: string | null; a_image: boolean }[]>(
        await db.from("figures").select("num, fichier, a_image").eq("base", base), "figures") ?? [];
      return d.map((x) => ({ num: x.num, fichier: x.fichier, image: !!x.a_image }));
    },
    async remplacerFigures(base, lignes) {
      const garder = lignes.map((l) => l.num);
      if (garder.length) ok(await db.from("figures").delete().eq("base", base).not("num", "in", `(${garder.join(",")})`), "figures (purge)");
      else ok(await db.from("figures").delete().eq("base", base), "figures (purge)");
      // Une ligne sans « image » garde l'image déjà en base (upsert colonne par colonne)
      const avec = lignes.filter((l) => l.image), sans = lignes.filter((l) => !l.image);
      if (avec.length) ok(await db.from("figures").upsert(avec), "figures");
      if (sans.length) ok(await db.from("figures").upsert(sans), "figures");
    },
    async imageFigure(base, fichier, mime, image) {
      const d = ok<unknown[]>(await db.from("figures").update({ image, mime }).eq("base", base).eq("fichier", fichier).select("num"), "image");
      return !!d?.length;
    },
    async journal(e) {
      ok(await db.from("imports").insert({ base: e.base, paragraphes: e.paragraphes, rapport: e.rapport, origine: "import-admin", fichiers: e.fichiers, auteur: e.auteur }), "journal");
    },
  };
}
