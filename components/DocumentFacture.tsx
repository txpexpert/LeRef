import { EMETTEUR } from "@/lib/config";
import { dateFr, mad, montantEnLettres } from "@/lib/format";
import BoutonImprimer from "./BoutonImprimer";

type F = {
  numero_proforma: string; numero_facture: string | null; date_proforma: string; date_facture: string | null;
  libelle: string; montant_ht: number; taux_tva: number; montant_tva: number; montant_ttc: number;
  statut: string; reference_virement: string | null; payee_le: string | null;
  client: { raison_sociale?: string; ice?: string; rc?: string; adresse?: string; ville?: string; email?: string };
};

export default function DocumentFacture({ f }: { f: F }) {
  const definitive = f.statut === "payee" && f.numero_facture;
  const ligne = (l: string, v?: string | null) => (v ? <div>{l} {v}</div> : null);
  return (
    <>
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 14, maxWidth: 820, marginInline: "auto" }}>
        <span className="muet">Utilisez « Imprimer » puis « Enregistrer au format PDF » pour obtenir le fichier.</span>
        <BoutonImprimer />
      </div>
      <div className="facture">
        <header>
          <div>
            <h1>{definitive ? "FACTURE" : "FACTURE PROFORMA"}</h1>
            <div className="num" style={{ fontSize: "1rem" }}>N° {definitive ? f.numero_facture : f.numero_proforma}</div>
            <div className="muet">Date : {dateFr(definitive ? f.date_facture : f.date_proforma)}</div>
            {definitive && <div className="muet">Réf. proforma : {f.numero_proforma}</div>}
          </div>
          <div style={{ textAlign: "right" }}>
            <b style={{ fontSize: "1.05rem" }}>{EMETTEUR.raisonSociale} {EMETTEUR.forme}</b>
            <div>{EMETTEUR.adresse}</div><div>{EMETTEUR.ville}</div>
            {ligne("ICE :", EMETTEUR.ice)}{ligne("RC :", EMETTEUR.rc)}{ligne("IF :", EMETTEUR.if)}{ligne("TP :", EMETTEUR.tp)}
          </div>
        </header>
        <div className="parties">
          <div><span className="etiquette">Client</span>
            <div><b>{f.client.raison_sociale}</b></div>
            {ligne("", f.client.adresse)}{ligne("", f.client.ville)}{ligne("ICE :", f.client.ice)}{ligne("RC :", f.client.rc)}
          </div>
          <div><span className="etiquette">{definitive ? "Règlement" : "Modalités de paiement"}</span>
            {definitive ? (
              <><div>Payée le {dateFr(f.payee_le)}</div>{ligne("Référence du virement :", f.reference_virement)}</>
            ) : (
              <>
                <div>Virement bancaire à réception</div>
                {ligne("Banque :", EMETTEUR.banque)}
                <div>RIB : <span className="num">{EMETTEUR.rib}</span></div>
                <div>Libellé du virement : <b>{f.numero_proforma}</b></div>
              </>
            )}
          </div>
        </div>
        <table className="tableau">
          <thead><tr><th>Désignation</th><th className="chiffre">Qté</th><th className="chiffre">Prix unitaire HT</th><th className="chiffre">Total HT</th></tr></thead>
          <tbody><tr><td>{f.libelle}</td><td className="chiffre">1</td><td className="chiffre">{mad(f.montant_ht)}</td><td className="chiffre">{mad(f.montant_ht)}</td></tr></tbody>
        </table>
        <table className="totaux">
          <tbody>
            <tr><td>Total HT</td><td className="chiffre">{mad(f.montant_ht)}</td></tr>
            <tr><td>TVA {Number(f.taux_tva)} %</td><td className="chiffre">{mad(f.montant_tva)}</td></tr>
            <tr><td>Total TTC</td><td className="chiffre">{mad(f.montant_ttc)}</td></tr>
          </tbody>
        </table>
        <p className="lettres">Arrêtée la présente {definitive ? "facture" : "facture proforma"} à la somme de : {montantEnLettres(Number(f.montant_ttc))} TTC.</p>
        {!definitive && <p className="muet">L&apos;accès au service est activé à réception du règlement. Cette proforma ne vaut pas facture.</p>}
        <footer>{EMETTEUR.raisonSociale} {EMETTEUR.forme} — {EMETTEUR.adresse} {EMETTEUR.ville} — ICE {EMETTEUR.ice} — {EMETTEUR.email}</footer>
      </div>
    </>
  );
}
