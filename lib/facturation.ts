// Création des proformas et calcul des montants.
import "server-only";
import { db } from "./supabase/admin";
import { EMETTEUR } from "./config";
import type { Organisation, Plan } from "./session";

export function calculer(ht: number) {
  const tva = Math.round(ht * EMETTEUR.tauxTva) / 100;
  return { ht, tva, ttc: Math.round((ht + tva) * 100) / 100 };
}

export async function creerProforma(org: Organisation, plan: Plan) {
  if (plan.prix_ht === null) throw new Error("Le tarif de cette formule n'est pas encore défini.");
  const { data: ab, error: e1 } = await db().from("abonnements")
    .insert({ organisation_id: org.id, plan_code: plan.code, statut: "en_attente" }).select("id").single();
  if (e1) throw new Error(e1.message);
  const { data: numero } = await db().rpc("prochain_numero", { prefixe: "PF" });
  const m = calculer(Number(plan.prix_ht));
  const { data: f, error: e2 } = await db().from("factures").insert({
    organisation_id: org.id, abonnement_id: ab.id, numero_proforma: numero,
    libelle: `Abonnement « ${plan.nom} » — ${plan.duree_mois} mois — ${plan.sieges} utilisateur${plan.sieges > 1 ? "s" : ""}`,
    montant_ht: m.ht, taux_tva: EMETTEUR.tauxTva, montant_tva: m.tva, montant_ttc: m.ttc,
    client: {
      raison_sociale: org.raison_sociale, ice: org.ice, rc: org.rc, adresse: org.adresse,
      ville: org.ville, email: org.email_facturation,
    },
  }).select("id").single();
  if (e2) throw new Error(e2.message);
  return f.id as string;
}
