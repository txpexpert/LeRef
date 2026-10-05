import { redirect } from "next/navigation";
import { exigerConnexion } from "@/lib/session";
import { db } from "@/lib/supabase/admin";
import { dateFr } from "@/lib/format";
import Formulaire from "@/components/Formulaire";
import { inviterMembre, retirerMembre } from "../actions";

export const metadata = { title: "Utilisateurs" };

export default async function Membres() {
  const c = await exigerConnexion("/compte/membres");
  if (!c.organisation || c.profil.role_org !== "gestionnaire") redirect("/compte");
  const { data: membres } = await db().from("profils").select("id, email, nom, role_org, cree_le").eq("organisation_id", c.organisation.id).order("cree_le");
  const sieges = c.actif?.plan.sieges ?? 1;
  return (
    <div className="pile">
      <div className="titre-section">
        <h1 style={{ fontSize: "1.7rem" }}>Utilisateurs</h1>
        <span className="muet">{membres?.length ?? 0} / {sieges} accès utilisés</span>
      </div>
      <div className="defile">
        <table className="tableau">
          <thead><tr><th>Nom</th><th>E-mail</th><th>Rôle</th><th>Depuis</th><th></th></tr></thead>
          <tbody>
            {(membres ?? []).map((m) => (
              <tr key={m.id}>
                <td>{m.nom || "—"}</td><td>{m.email}</td>
                <td>{m.role_org === "gestionnaire" ? <span className="badge info">Gestionnaire</span> : "Utilisateur"}</td>
                <td>{dateFr(m.cree_le)}</td>
                <td>{m.id !== c.profil.id && (
                  <form action={retirerMembre.bind(null, m.id)}><button className="btn secondaire petit" type="submit">Retirer l&apos;accès</button></form>
                )}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="carte">
        <h2>Ajouter un utilisateur</h2>
        <p className="muet" style={{ marginTop: 0 }}>Chaque accès est nominatif et ne peut être ouvert que sur un poste à la fois. La personne reçoit un e-mail pour choisir son mot de passe.</p>
        <Formulaire action={inviterMembre} bouton="Envoyer l'invitation">
          <div className="deux-col">
            <label className="champ" htmlFor="nom">Nom et prénom<input id="nom" name="nom" /></label>
            <label className="champ" htmlFor="email">Adresse e-mail<input id="email" name="email" type="email" required /></label>
          </div>
        </Formulaire>
      </div>
    </div>
  );
}
