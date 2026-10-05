import { redirect } from "next/navigation";
import { modeLocal } from "@/lib/local";
import FormulaireAuth from "@/components/FormulaireAuth";
import { demanderReinitialisation } from "../connexion/actions";

export const metadata = { title: "Mot de passe oublié" };

export default function MotDePasse() {
  if (modeLocal()) redirect("/?mode=local");
  return (
    <div className="auth carte">
      <h1 style={{ fontSize: "1.6rem", marginBottom: 14 }}>Mot de passe oublié</h1>
      <FormulaireAuth action={demanderReinitialisation} bouton="Recevoir un lien"
        champs={[{ nom: "email", libelle: "Adresse e-mail du compte", type: "email", auto: "email" }]} />
    </div>
  );
}
