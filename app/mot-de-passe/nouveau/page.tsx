import Link from "next/link";
import FormulaireAuth from "@/components/FormulaireAuth";
import { changerMotDePasse } from "../../connexion/actions";
import { exigerConnexion } from "@/lib/session";

export const metadata = { title: "Nouveau mot de passe" };

export default async function NouveauMotDePasse() {
  await exigerConnexion("/mot-de-passe/nouveau");
  return (
    <div className="auth carte">
      <h1 style={{ fontSize: "1.6rem", marginBottom: 14 }}>Choisir un nouveau mot de passe</h1>
      <FormulaireAuth action={changerMotDePasse} bouton="Enregistrer" antiRobot={false}
        champs={[{ nom: "mot_de_passe", libelle: "Nouveau mot de passe", type: "password", auto: "new-password", aide: "10 caractères au minimum." }]} />
      <p style={{ fontSize: ".88rem", marginBottom: 0 }}><Link href="/compte">Aller à mon compte</Link></p>
    </div>
  );
}
