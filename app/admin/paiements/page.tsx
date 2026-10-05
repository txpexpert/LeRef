import Link from "next/link";
import { db } from "@/lib/supabase/admin";
import { dateFr, mad } from "@/lib/format";
import Formulaire from "@/components/Formulaire";
import { annulerProforma, validerPaiement } from "../actions";

export const metadata = { title: "Paiements" };

export default async function Paiements({ searchParams }: { searchParams: { valide?: string } }) {
  const [attente, payees] = await Promise.all([
    db().from("factures").select("*").eq("statut", "proforma").order("date_proforma"),
    db().from("factures").select("*").eq("statut", "payee").order("payee_le", { ascending: false }).limit(30),
  ]);
  return (
    <div className="pile">
      <h1 style={{ fontSize: "1.7rem" }}>Paiements</h1>
      {searchParams.valide && <div className="message ok">Paiement enregistré : facture {searchParams.valide} émise et abonnement activé.</div>}
      <p className="muet" style={{ margin: 0 }}>À réception d&apos;un virement, saisissez sa référence : la facture définitive est numérotée et l&apos;abonnement activé immédiatement.</p>
      {(attente.data ?? []).map((f) => (
        <div key={f.id} className="carte paiement">
          <div>
            <span className="etiquette">Proforma {f.numero_proforma} · {dateFr(f.date_proforma)}</span>
            <h2 style={{ margin: "4px 0" }}>{f.client.raison_sociale}</h2>
            <div className="muet">{f.libelle}</div>
            <div style={{ marginTop: 6 }}><b>{mad(f.montant_ttc)}</b> TTC · <Link href={`/compte/factures/${f.id}`}>Afficher</Link></div>
          </div>
          <div>
            <Formulaire action={validerPaiement} bouton="Valider le paiement"
              boutons={<button className="btn secondaire" formAction={annulerProforma.bind(null, f.id)}>Annuler</button>}>
              <input type="hidden" name="facture" value={f.id} />
              <label className="champ" htmlFor={`ref-${f.id}`}>Référence du virement<input id={`ref-${f.id}`} name="reference" /></label>
            </Formulaire>
          </div>
        </div>
      ))}
      {!attente.data?.length && <div className="carte muet">Aucune proforma en attente.</div>}
      <h2 style={{ fontSize: "1.2rem", marginTop: 10 }}>Dernières factures payées</h2>
      <div className="defile">
        <table className="tableau">
          <thead><tr><th>Facture</th><th>Payée le</th><th>Client</th><th>Virement</th><th className="chiffre">TTC</th></tr></thead>
          <tbody>
            {(payees.data ?? []).map((f) => (
              <tr key={f.id}><td className="num"><Link href={`/compte/factures/${f.id}`}>{f.numero_facture}</Link></td><td>{dateFr(f.payee_le)}</td>
                <td>{f.client.raison_sociale}</td><td>{f.reference_virement}</td><td className="chiffre">{mad(f.montant_ttc)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
