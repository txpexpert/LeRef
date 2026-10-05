"use server";
import { redirect } from "next/navigation";
import { authClient } from "@/lib/supabase/auth";
import { ouvrirSession } from "@/lib/ouverture";
import { verifierHumain } from "@/lib/turnstile";
import { ipClient } from "@/lib/requete";
import { SITE } from "@/lib/config";

export type Etat = { erreur?: string; ok?: string } | undefined;

function retourSur(v: FormDataEntryValue | null) {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/compte";
}

export async function seConnecter(_: Etat, f: FormData): Promise<Etat> {
  if (!(await verifierHumain(f.get("cf-turnstile-response"), ipClient()))) return { erreur: "Vérification anti-robot échouée. Rechargez la page et réessayez." };
  const email = String(f.get("email") ?? "").trim().toLowerCase();
  const motDePasse = String(f.get("mot_de_passe") ?? "");
  const { data, error } = await authClient().auth.signInWithPassword({ email, password: motDePasse });
  if (error || !data.user) {
    if (error?.message?.toLowerCase().includes("confirm")) return { erreur: "Confirmez d'abord votre adresse e-mail à l'aide du lien reçu." };
    return { erreur: "Adresse e-mail ou mot de passe incorrect." };
  }
  await ouvrirSession(data.user.id);
  redirect(retourSur(f.get("retour")));
}

export async function sInscrire(_: Etat, f: FormData): Promise<Etat> {
  if (!(await verifierHumain(f.get("cf-turnstile-response"), ipClient()))) return { erreur: "Vérification anti-robot échouée. Rechargez la page et réessayez." };
  const nom = String(f.get("nom") ?? "").trim();
  const email = String(f.get("email") ?? "").trim().toLowerCase();
  const motDePasse = String(f.get("mot_de_passe") ?? "");
  const domaine = email.split("@")[1] ?? "";
  if (!nom || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { erreur: "Indiquez votre nom et une adresse e-mail valide." };
  if (SITE.domainesRefuses.some((d) => domaine === d || domaine.endsWith("." + d)))
    return { erreur: "Ce service est réservé aux entreprises et professionnels du secteur privé. Utilisez votre adresse professionnelle d'entreprise." };
  if (motDePasse.length < 10) return { erreur: "Le mot de passe doit contenir au moins 10 caractères." };
  const { error } = await authClient().auth.signUp({
    email, password: motDePasse,
    options: { data: { nom }, emailRedirectTo: `${SITE.url}/auth/callback?suite=/compte` },
  });
  if (error) return { erreur: error.message.includes("registered") ? "Un compte existe déjà avec cette adresse." : "L'inscription n'a pas abouti. Réessayez dans un instant." };
  return { ok: `Un e-mail de confirmation a été envoyé à ${email}. Cliquez sur le lien qu'il contient pour activer votre compte.` };
}

export async function demanderReinitialisation(_: Etat, f: FormData): Promise<Etat> {
  if (!(await verifierHumain(f.get("cf-turnstile-response"), ipClient()))) return { erreur: "Vérification anti-robot échouée." };
  const email = String(f.get("email") ?? "").trim().toLowerCase();
  await authClient().auth.resetPasswordForEmail(email, { redirectTo: `${SITE.url}/auth/callback?suite=/mot-de-passe/nouveau` });
  return { ok: "Si un compte existe pour cette adresse, un lien de réinitialisation vient de lui être envoyé." };
}

export async function changerMotDePasse(_: Etat, f: FormData): Promise<Etat> {
  const motDePasse = String(f.get("mot_de_passe") ?? "");
  if (motDePasse.length < 10) return { erreur: "Le mot de passe doit contenir au moins 10 caractères." };
  const { error } = await authClient().auth.updateUser({ password: motDePasse });
  if (error) return { erreur: "Le lien a expiré. Refaites une demande de réinitialisation." };
  return { ok: "Mot de passe modifié. Vous pouvez continuer." };
}
