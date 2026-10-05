import { exigerConnexion, type Plan } from "@/lib/session";
import { db } from "@/lib/supabase/admin";
import { dateFr, mad } from "@/lib/format";
import { calculer } from "@/lib/facturation";
import Formulaire from "@/components/Formulaire";
import ChampsOrganisation from "@/components/ChampsOrganisation";
import { commander, creerOrganisation } from "../actions";

export const metadata = { title: "Abonnement" };

export default async function Abonnement({ searchParams }: { searchParams: { formule?: string } }) {
  const c = await exigerConnexion(`/compte/abonnement${searchParams.formule ? "?formule=" + searchParams.formule : ""}`);
  if (!c.organisation) {
    return (
      <div className="carte">
        <h1 style={{ fontSize: "1.5rem", marginBottom: 6 }}>Votre entreprise</h1>
        <p className="muet" style={{ marginTop: 0 }}>Renseignez d&apos;abord les informations qui figureront sur la facture.</p>
        <Formulaire action={creerOrganisation} bouton="Continuer">
          <input type="hidden" name="essai" value="0" />
          <input type="hidden" name="suite" value={`/compte/abonnement${searchParams.formule ? "?formule=" + searchParams.formule : ""}`} />
          <ChampsOrganisation />
        </Formulaire>
      </div>
    );
  }
  if (c.profil.role_org !== "gestionnaire")
    return <div className="message info">L&apos;abonnement de votre entreprise est géré par son gestionnaire de compte.</div>;

  const plans = ((await db().from("plans").select("*").eq("public", true).order("ordre")).data ?? []) as Plan[];
  return (
    <div className="pile">
      <h1 style={{ fontSize: "1.7rem" }}>{c.actif && c.actif.statut === "actif" ? "Renouveler ou changer de formule" : "Choisir une formule"}</h1>
      {c.actif && <p className="message info">Formule en cours : <b>{c.actif.plan.nom}</b>, jusqu&apos;au {dateFr(c.actif.fin)}. Un renouvellement prend effet à la fin de la période en cours.</p>}
      <div className="carte">
        <Formulaire action={commander} bouton="Recevoir la facture proforma">
          <div className="defile">
            <table className="tableau">
              <thead><tr><th></th><th>Formule</th><th>Utilisateurs</th><th>Durée</th><th className="chiffre">HT</th><th className="chiffre">TTC</th></tr></thead>
              <tbody>
                {plans.map((p) => (
                  <tr key={p.code}>
                    <td><input type="radio" name="plan" value={p.code} id={`plan-${p.code}`} defaultChecked={p.code === searchParams.formule} disabled={p.prix_ht === null} required /></td>
                    <td><label htmlFor={`plan-${p.code}`}><b>{p.nom}</b><br /><span className="muet" style={{ fontSize: ".85rem" }}>{p.description}</span></label></td>
                    <td>{p.sieges}</td><td>{p.duree_mois} mois</td>
                    <td className="chiffre">{p.prix_ht === null ? "Sur devis" : mad(p.prix_ht)}</td>
                    <td className="chiffre">{p.prix_ht === null ? "—" : mad(calculer(Number(p.prix_ht)).ttc)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muet" style={{ margin: 0, fontSize: ".88rem" }}>
            Une facture proforma est émise au nom de {c.organisation.raison_sociale}. Réglez-la par virement en indiquant son numéro :
            l&apos;accès est activé dès réception du paiement, et la facture définitive est alors disponible dans votre espace.
          </p>
        </Formulaire>
      </div>
    </div>
  );
}
