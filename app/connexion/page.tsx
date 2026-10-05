import { redirect } from "next/navigation";
import { modeLocal } from "@/lib/local";
import Link from "next/link";
import FormulaireAuth from "@/components/FormulaireAuth";
import { seConnecter } from "./actions";

export const metadata = { title: "Connexion" };

const RAISONS: Record<string, string> = {
  session: "Votre compte a été ouvert sur un autre appareil : cette session a été fermée. Un accès ne peut être utilisé que sur un poste à la fois.",
  expiree: "Votre session a expiré. Reconnectez-vous.",
};

export default function Connexion({ searchParams }: { searchParams: { retour?: string; raison?: string } }) {
  if (modeLocal()) redirect("/?mode=local");
  return (
    <div className="auth carte">
      <h1 style={{ fontSize: "1.6rem", marginBottom: 14 }}>Se connecter</h1>
      {searchParams.raison && RAISONS[searchParams.raison] && <p className="message info">{RAISONS[searchParams.raison]}</p>}
      <FormulaireAuth action={seConnecter} bouton="Se connecter" cache={{ retour: searchParams.retour ?? "/compte" }}
        champs={[
          { nom: "email", libelle: "Adresse e-mail", type: "email", auto: "email" },
          { nom: "mot_de_passe", libelle: "Mot de passe", type: "password", auto: "current-password" },
        ]} />
      <p style={{ fontSize: ".88rem", marginBottom: 0 }}>
        <Link href="/mot-de-passe">Mot de passe oublié ?</Link> · Pas encore de compte ? <Link href="/inscription">Essai gratuit</Link>
      </p>
    </div>
  );
}
