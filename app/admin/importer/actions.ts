"use server";
// Import direct : reçoit les fichiers déposés, contrôle, puis écrit en base.
import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase/admin";
import { exigerAdmin } from "@/lib/session";
import { importer, typeDe, type FichierRecu, type ResultatImport } from "@/lib/importation";
import { depotSupabase } from "@/lib/importation-supabase";

export async function importerFichiers(f: FormData): Promise<ResultatImport | { erreur: string }> {
  const c = await exigerAdmin();
  const base = String(f.get("base") ?? "").trim();
  if (!base) return { erreur: "Choisissez le guide concerné." };
  const simulation = f.get("simulation") === "1";
  const fichiers: FichierRecu[] = [];
  for (const v of f.getAll("fichiers")) {
    if (typeof v === "string") continue;
    const nom = v.name;
    fichiers.push(typeDe(nom) === "figure"
      ? { nom, octets: new Uint8Array(await v.arrayBuffer()) }
      : { nom, texte: await v.text() });
  }
  if (!fichiers.length) return { erreur: "Aucun fichier reçu." };
  try {
    const r = await importer(depotSupabase(db()), {
      base, fichiers, simulation, retirerAbsents: f.get("retirer") === "1", auteur: c.profil.email,
    });
    // Les pages sont rendues à chaque requête ; on invalide aussi les rares pages mises en cache (plan du site)
    if (!simulation && !r.erreurs.length) revalidatePath("/", "layout");
    return r;
  } catch (e) {
    return { erreur: `Écriture interrompue : ${(e as Error).message}` };
  }
}
