// Identité de l'utilisateur, abonnement en cours et droits d'accès.
// Tout est calculé côté serveur ; le navigateur ne reçoit que le résultat.
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authClient } from "./supabase/auth";
import { db } from "./supabase/admin";
import { modeLocal } from "./local";

export const COOKIE_SESSION = "gp_sid";

export type Profil = {
  id: string; email: string; nom: string | null; organisation_id: string | null;
  role_org: "membre" | "gestionnaire"; est_admin: boolean; session_active: string | null;
  bloque_jusqua: string | null;
};
export type Organisation = {
  id: string; raison_sociale: string; ice: string | null; rc: string | null; adresse: string | null;
  ville: string | null; email_facturation: string | null; telephone: string | null;
};
export type Plan = {
  code: string; nom: string; description: string | null; bases: string[]; sieges: number;
  duree_mois: number; prix_ht: number | null; quota_jour: number; quota_heure: number; public: boolean;
};
export type Abonnement = {
  id: string; organisation_id: string; plan_code: string; statut: string; debut: string | null; fin: string | null;
  plan: Plan;
};

export type Contexte =
  | { etat: "anonyme" }
  | { etat: "autre_session" }
  | { etat: "connecte"; profil: Profil; organisation: Organisation | null; abonnements: Abonnement[]; actif: Abonnement | null };

const aujourdHui = () => new Date().toISOString().slice(0, 10);

export const contexte = cache(async (): Promise<Contexte> => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return { etat: "anonyme" };
  const { data } = await authClient().auth.getUser();
  if (!data.user) return { etat: "anonyme" };

  const { data: profil } = await db().from("profils").select("*").eq("id", data.user.id).single<Profil>();
  if (!profil) return { etat: "anonyme" };

  // Une seule session active par compte : la dernière connexion l'emporte.
  const jeton = cookies().get(COOKIE_SESSION)?.value;
  if (profil.session_active && profil.session_active !== jeton) return { etat: "autre_session" };

  let organisation: Organisation | null = null;
  let abonnements: Abonnement[] = [];
  if (profil.organisation_id) {
    const [o, a] = await Promise.all([
      db().from("organisations").select("*").eq("id", profil.organisation_id).single<Organisation>(),
      db().from("abonnements").select("*, plan:plans(*)").eq("organisation_id", profil.organisation_id)
        .order("cree_le", { ascending: false }),
    ]);
    organisation = o.data;
    abonnements = (a.data ?? []) as Abonnement[];
  }
  const j = aujourdHui();
  const actif = abonnements.find((a) =>
    (a.statut === "actif" || a.statut === "essai") && a.debut && a.fin && a.debut <= j && j <= a.fin) ?? null;
  return { etat: "connecte", profil, organisation, abonnements, actif };
});

export async function exigerConnexion(retour = "/compte") {
  if (modeLocal()) redirect("/?mode=local");
  const c = await contexte();
  if (c.etat === "autre_session") redirect("/deconnexion?raison=session");
  if (c.etat !== "connecte") redirect(`/connexion?retour=${encodeURIComponent(retour)}`);
  return c;
}

export async function exigerAdmin() {
  const c = await exigerConnexion("/admin");
  if (!c.profil.est_admin) redirect("/compte");
  return c;
}

export type Acces =
  | { ok: true; admin: boolean; plan: Plan | null }
  | { ok: false; raison: "anonyme" | "autre_session" | "sans_abonnement" | "guide_non_inclus" | "bloque" };

export async function accesGuide(base: string): Promise<Acces> {
  // Mode local (sans Supabase) : lecture intégrale, sans compte ni abonnement
  if (modeLocal()) return { ok: true, admin: false, plan: null };
  const c = await contexte();
  if (c.etat === "anonyme") return { ok: false, raison: "anonyme" };
  if (c.etat === "autre_session") return { ok: false, raison: "autre_session" };
  if (c.profil.est_admin) return { ok: true, admin: true, plan: null };
  if (c.profil.bloque_jusqua && new Date(c.profil.bloque_jusqua) > new Date()) return { ok: false, raison: "bloque" };
  if (!c.actif) return { ok: false, raison: "sans_abonnement" };
  const bases = c.actif.plan.bases;
  if (!bases.includes("*") && !bases.includes(base)) return { ok: false, raison: "guide_non_inclus" };
  return { ok: true, admin: false, plan: c.actif.plan };
}

// Contrôle du quota et journalisation d'une lecture. Renvoie false si la limite est atteinte.
export async function enregistrerLecture(
  userId: string, base: string, num: string, plan: Plan | null, ip: string | null, agent: string | null,
): Promise<{ autorise: boolean; heure: number; jour: number }> {
  const { data: u } = await db().rpc("usage_utilisateur", { p_user: userId });
  const usage = (Array.isArray(u) ? u[0] : u) ?? { heure: 0, jour: 0 };
  const heure = Number(usage.heure), jour = Number(usage.jour);
  if (plan) {
    const depasse = heure >= plan.quota_heure || jour >= plan.quota_jour;
    if (depasse) {
      // Relire un paragraphe déjà consulté dans les 24 h reste permis
      const { data: deja } = await db().from("consultations").select("id")
        .eq("user_id", userId).eq("base", base).eq("num", num)
        .gte("le", new Date(Date.now() - 864e5).toISOString()).limit(1);
      if (!deja?.length) return { autorise: false, heure, jour };
    }
  }
  await db().from("consultations").insert({ user_id: userId, base, num, ip, agent: agent?.slice(0, 200) ?? null });
  return { autorise: true, heure, jour };
}
