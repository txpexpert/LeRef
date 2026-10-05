"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/supabase/admin";
import { exigerConnexion, type Plan } from "@/lib/session";
import { creerProforma } from "@/lib/facturation";
import { SITE } from "@/lib/config";

export type Etat = { erreur?: string; ok?: string } | undefined;

function champsOrganisation(f: FormData) {
  const v = (k: string) => String(f.get(k) ?? "").trim() || null;
  return {
    raison_sociale: v("raison_sociale") ?? "", ice: v("ice"), rc: v("rc"), adresse: v("adresse"),
    ville: v("ville"), email_facturation: v("email_facturation"), telephone: v("telephone"),
  };
}

// Création de l'organisation (première fois), avec ou sans démarrage de l'essai
export async function creerOrganisation(_: Etat, f: FormData): Promise<Etat> {
  const c = await exigerConnexion();
  if (c.profil.organisation_id) return { erreur: "Votre compte est déjà rattaché à une organisation." };
  const org = champsOrganisation(f);
  if (!org.raison_sociale) return { erreur: "Indiquez la raison sociale de votre entreprise." };
  if (org.ice && !/^\d{15}$/.test(org.ice)) return { erreur: "L'ICE comporte 15 chiffres." };
  const { data, error } = await db().from("organisations").insert(org).select("id").single();
  if (error) return { erreur: "Enregistrement impossible. Réessayez." };
  await db().from("profils").update({ organisation_id: data.id, role_org: "gestionnaire" }).eq("id", c.profil.id);
  if (f.get("essai") === "1") {
    const debut = new Date(), fin = new Date(Date.now() + SITE.essaiJours * 864e5);
    await db().from("abonnements").insert({
      organisation_id: data.id, plan_code: "essai", statut: "essai",
      debut: debut.toISOString().slice(0, 10), fin: fin.toISOString().slice(0, 10),
    });
  }
  const suite = String(f.get("suite") ?? "");
  redirect(suite.startsWith("/compte") ? suite : "/compte");
}

export async function modifierOrganisation(_: Etat, f: FormData): Promise<Etat> {
  const c = await exigerConnexion();
  if (!c.organisation || c.profil.role_org !== "gestionnaire") return { erreur: "Seul le gestionnaire du compte peut modifier ces informations." };
  const org = champsOrganisation(f);
  if (!org.raison_sociale) return { erreur: "La raison sociale est obligatoire." };
  if (org.ice && !/^\d{15}$/.test(org.ice)) return { erreur: "L'ICE comporte 15 chiffres." };
  await db().from("organisations").update(org).eq("id", c.organisation.id);
  revalidatePath("/compte");
  return { ok: "Informations enregistrées." };
}

export async function commander(_: Etat, f: FormData): Promise<Etat> {
  const c = await exigerConnexion();
  if (!c.organisation) return { erreur: "Renseignez d'abord votre entreprise." };
  if (c.profil.role_org !== "gestionnaire") return { erreur: "Seul le gestionnaire du compte peut souscrire un abonnement." };
  const { data: plan } = await db().from("plans").select("*").eq("code", String(f.get("plan") ?? "")).eq("public", true).single<Plan>();
  if (!plan) return { erreur: "Choisissez une formule." };
  const enAttente = c.abonnements.find((a) => a.statut === "en_attente" && a.plan_code === plan.code);
  if (enAttente) {
    const { data: f2 } = await db().from("factures").select("id").eq("abonnement_id", enAttente.id).eq("statut", "proforma").maybeSingle();
    if (f2) redirect(`/compte/factures/${f2.id}`);
  }
  let id: string;
  try { id = await creerProforma(c.organisation, plan); }
  catch (e) { return { erreur: (e as Error).message }; }
  redirect(`/compte/factures/${id}`);
}

export async function inviterMembre(_: Etat, f: FormData): Promise<Etat> {
  const c = await exigerConnexion();
  if (!c.organisation || c.profil.role_org !== "gestionnaire") return { erreur: "Action réservée au gestionnaire du compte." };
  if (!c.actif) return { erreur: "Un abonnement actif est nécessaire pour ajouter des utilisateurs." };
  const email = String(f.get("email") ?? "").trim().toLowerCase();
  const nom = String(f.get("nom") ?? "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { erreur: "Adresse e-mail invalide." };
  const { count } = await db().from("profils").select("id", { count: "exact", head: true }).eq("organisation_id", c.organisation.id);
  if ((count ?? 0) >= c.actif.plan.sieges) return { erreur: `Votre formule comprend ${c.actif.plan.sieges} utilisateur(s) : tous les accès sont attribués.` };

  const { data: existant } = await db().from("profils").select("id, organisation_id").eq("email", email).maybeSingle();
  if (existant?.organisation_id) return { erreur: "Cette personne est déjà rattachée à une organisation." };
  let id = existant?.id as string | undefined;
  if (!id) {
    const { data, error } = await db().auth.admin.inviteUserByEmail(email, {
      data: { nom }, redirectTo: `${SITE.url}/auth/callback?suite=/mot-de-passe/nouveau`,
    });
    if (error || !data.user) return { erreur: "L'invitation n'a pas pu être envoyée." };
    id = data.user.id;
  }
  await db().from("profils").update({ organisation_id: c.organisation.id, role_org: "membre", ...(nom ? { nom } : {}) }).eq("id", id);
  revalidatePath("/compte/membres");
  return { ok: existant ? `${email} a été ajouté à votre organisation.` : `Invitation envoyée à ${email}.` };
}

export async function retirerMembre(id: string) {
  const c = await exigerConnexion();
  if (!c.organisation || c.profil.role_org !== "gestionnaire" || id === c.profil.id) return;
  await db().from("profils").update({ organisation_id: null, role_org: "membre", session_active: null })
    .eq("id", id).eq("organisation_id", c.organisation.id);
  revalidatePath("/compte/membres");
}
