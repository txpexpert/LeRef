import Link from "next/link";
import { db } from "@/lib/supabase/admin";
import { dateFr, mad } from "@/lib/format";

export const metadata = { title: "Administration" };

export default async function Admin() {
  const j = new Date().toISOString().slice(0, 10);
  const debutAnnee = `${j.slice(0, 4)}-01-01`;
  const [actifs, essais, attente, encaisse, lectures, suspects] = await Promise.all([
    db().from("abonnements").select("id", { count: "exact", head: true }).eq("statut", "actif").gte("fin", j),
    db().from("abonnements").select("id", { count: "exact", head: true }).eq("statut", "essai").gte("fin", j),
    db().from("factures").select("id, numero_proforma, date_proforma, montant_ttc, client").eq("statut", "proforma").order("date_proforma"),
    db().from("factures").select("montant_ht").eq("statut", "payee").gte("payee_le", debutAnnee),
    db().from("consultations").select("id", { count: "exact", head: true }).gte("le", new Date(Date.now() - 864e5).toISOString()),
    db().from("surveillance_24h").select("user_id").gte("pct_sequentiel", 60).gte("lectures", 40),
  ]);
  const ca = (encaisse.data ?? []).reduce((s, f) => s + Number(f.montant_ht), 0);
  return (
    <div className="pile">
      <h1 style={{ fontSize: "1.7rem" }}>Vue d&apos;ensemble</h1>
      <div className="chiffres">
        <div><span>Abonnements actifs</span><b>{actifs.count ?? 0}</b></div>
        <div><span>Essais en cours</span><b>{essais.count ?? 0}</b></div>
        <div><span>Encaissé {j.slice(0, 4)} (HT)</span><b style={{ fontSize: "1.2rem" }}>{mad(ca)}</b></div>
        <div><span>Lectures sur 24 h</span><b>{lectures.count ?? 0}</b></div>
      </div>
      {!!suspects.data?.length && (
        <div className="message erreur">
          {suspects.data.length} compte(s) présentent une lecture séquentielle intensive sur 24 h. <Link href="/admin/surveillance">Examiner</Link>
        </div>
      )}
      <div className="carte">
        <div className="titre-section" style={{ marginBottom: 8 }}><h2 style={{ margin: 0 }}>Proformas en attente de paiement</h2><Link href="/admin/paiements">Tout voir</Link></div>
        <div className="defile">
          <table className="tableau">
            <thead><tr><th>N°</th><th>Date</th><th>Client</th><th className="chiffre">TTC</th></tr></thead>
            <tbody>
              {(attente.data ?? []).slice(0, 8).map((f) => (
                <tr key={f.id}><td className="num">{f.numero_proforma}</td><td>{dateFr(f.date_proforma)}</td>
                  <td>{(f.client as { raison_sociale?: string }).raison_sociale}</td><td className="chiffre">{mad(f.montant_ttc)}</td></tr>
              ))}
              {!attente.data?.length && <tr><td colSpan={4} className="muet">Aucune proforma en attente.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
