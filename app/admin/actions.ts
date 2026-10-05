"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/supabase/admin";
import { exigerAdmin } from "@/lib/session";
import { lireEmpreintes } from "@/lib/filigrane";

export type Etat = { erreur?: string; ok?: string; resultats?: { code: string; comptes: { email: string; nom: string | null; organisation: string | null }[] }[] } | undefined;

export async function validerPaiement(_: Etat, f: FormData): Promise<Etat> {
  await exigerAdmin();
  const id = String(f.get("facture") ?? ""), ref = String(f.get("reference") ?? "").trim();
  if (!ref) return { erreur: "Indiquez la référence du virement reçu." };
  const { error } = await db().rpc("valider_paiement", { p_facture: id, p_reference: ref });
  if (error) return { erreur: error.message };
  const { data } = await db().from("factures").select("numero_facture").eq("id", id).single();
  redirect(`/admin/paiements?valide=${encodeURIComponent(data?.numero_facture ?? "")}`);
}

export async function annulerProforma(id: string) {
  await exigerAdmin();
  const { data: f } = await db().from("factures").update({ statut: "annulee" }).eq("id", id).eq("statut", "proforma").select("abonnement_id").maybeSingle();
  if (f?.abonnement_id) await db().from("abonnements").update({ statut: "annule" }).eq("id", f.abonnement_id).eq("statut", "en_attente");
  revalidatePath("/admin/paiements");
}

export async function changerStatut(id: string, statut: "actif" | "suspendu") {
  await exigerAdmin();
  await db().from("abonnements").update({ statut }).eq("id", id);
  revalidatePath("/admin/clients");
}

export async function bloquer(userId: string, heures: number) {
  await exigerAdmin();
  const jusqua = heures > 0 ? new Date(Date.now() + heures * 3600e3).toISOString() : null;
  await db().from("profils").update({ bloque_jusqua: jusqua, ...(heures > 0 ? { session_active: null } : {}) }).eq("id", userId);
  revalidatePath("/admin/surveillance");
}

export async function identifierCopie(_: Etat, f: FormData): Promise<Etat> {
  await exigerAdmin();
  const codes = lireEmpreintes(String(f.get("texte") ?? ""));
  if (!codes.length) return { erreur: "Aucune empreinte trouvée. Collez le texte tel qu'il a été copié (le marquage disparaît si le texte a été ressaisi)." };
  const resultats = [];
  for (const code of codes) {
    const bas = `${code}-0000-0000-0000-000000000000`, haut = `${code}-ffff-ffff-ffff-ffffffffffff`;
    const { data } = await db().from("profils").select("email, nom, organisations(raison_sociale)").gte("id", bas).lte("id", haut);
    resultats.push({
      code,
      comptes: (data ?? []).map((p) => ({
        email: p.email, nom: p.nom,
        organisation: (p.organisations as unknown as { raison_sociale: string } | null)?.raison_sociale ?? null,
      })),
    });
  }
  return { resultats };
}
