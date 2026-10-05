import { redirect } from "next/navigation";
import { modeLocal } from "@/lib/local";
import Link from "next/link";
import FormulaireAuth from "@/components/FormulaireAuth";
import { sInscrire } from "../connexion/actions";
import { SITE } from "@/lib/config";

export const metadata = { title: "Créer un compte" };

export default function Inscription() {
  if (modeLocal()) redirect("/?mode=local");
  return (
    <div className="auth carte">
      <h1 style={{ fontSize: "1.6rem", marginBottom: 6 }}>Créer un compte</h1>
      <p className="muet" style={{ marginTop: 0 }}>Essai gratuit de {SITE.essaiJours} jours, sans engagement. Réservé aux entreprises et professionnels du secteur privé.</p>
      <FormulaireAuth action={sInscrire} bouton="Créer mon compte"
        champs={[
          { nom: "nom", libelle: "Nom et prénom", auto: "name" },
          { nom: "email", libelle: "Adresse e-mail professionnelle", type: "email", auto: "email" },
          { nom: "mot_de_passe", libelle: "Mot de passe", type: "password", auto: "new-password", aide: "10 caractères au minimum." },
        ]} />
      <p style={{ fontSize: ".82rem" }} className="muet">
        En créant un compte, vous acceptez les <Link href="/legal/cgu">conditions générales</Link>, notamment l&apos;interdiction de toute extraction des contenus.
      </p>
      <p style={{ fontSize: ".88rem", marginBottom: 0 }}>Déjà inscrit ? <Link href="/connexion">Se connecter</Link></p>
    </div>
  );
}
