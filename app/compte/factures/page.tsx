import Link from "next/link";
import { exigerConnexion } from "@/lib/session";
import { db } from "@/lib/supabase/admin";
import { dateFr, mad } from "@/lib/format";

export const metadata = { title: "Factures" };

export default async function Factures() {
  const c = await exigerConnexion("/compte/factures");
  const { data } = c.organisation
    ? await db().from("factures").select("*").eq("organisation_id", c.organisation.id).order("date_proforma", { ascending: false })
    : { data: [] };
  return (
    <div className="pile">
      <h1 style={{ fontSize: "1.7rem" }}>Factures</h1>
      <div className="defile">
        <table className="tableau">
          <thead><tr><th>Numéro</th><th>Date</th><th>Objet</th><th className="chiffre">TTC</th><th>Statut</th><th></th></tr></thead>
          <tbody>
            {(data ?? []).map((f) => (
              <tr key={f.id}>
                <td className="num">{f.numero_facture ?? f.numero_proforma}</td>
                <td>{dateFr(f.date_facture ?? f.date_proforma)}</td>
                <td>{f.libelle}</td>
                <td className="chiffre">{mad(f.montant_ttc)}</td>
                <td>{f.statut === "payee" ? <span className="badge ok">Payée</span> : f.statut === "annulee" ? <span className="badge neutre">Annulée</span> : <span className="badge partiel">Proforma — en attente</span>}</td>
                <td><Link className="btn secondaire petit" href={`/compte/factures/${f.id}`}>Afficher</Link></td>
              </tr>
            ))}
            {!data?.length && <tr><td colSpan={6} className="muet">Aucune facture.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
