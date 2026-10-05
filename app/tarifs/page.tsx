import Link from "next/link";
import { db, dbConfiguree } from "@/lib/supabase/admin";
import { mad } from "@/lib/format";
import { SITE } from "@/lib/config";
import type { Plan } from "@/lib/session";
import { listeBases } from "@/lib/contenu";

export const metadata = { title: "Tarifs" };

export default async function Tarifs() {
  const plans: Plan[] = dbConfiguree()
    ? ((await db().from("plans").select("*").eq("public", true).order("ordre")).data ?? []) as Plan[]
    : [];
  const titres = new Map((await listeBases()).map((b) => [b.slug, b.titre]));
  return (
    <>
      <div className="titre-section">
        <div>
          <span className="etiquette">Abonnements annuels</span>
          <h1 style={{ fontSize: "2rem" }}>Formules et tarifs</h1>
        </div>
        <Link className="btn secondaire" href="/inscription">Essai gratuit de {SITE.essaiJours} jours</Link>
      </div>
      <div className="grille-3">
        {plans.map((p, i) => (
          <div key={p.code} className={`carte tarif${i === 1 ? " mis-en-avant" : ""}`}>
            <span className="etiquette">{p.bases.includes("*") ? "Tous les guides" : p.bases.map((b) => titres.get(b) ?? b).join(", ")}</span>
            <h2>{p.nom}</h2>
            <div className="prix">{p.prix_ht === null ? "Sur devis" : <>{mad(p.prix_ht)} <small className="muet" style={{ fontSize: ".9rem" }}>HT / an</small></>}</div>
            <p className="muet" style={{ margin: 0 }}>{p.description}</p>
            <ul>
              <li>{p.sieges} utilisateur{p.sieges > 1 ? "s" : ""} nommé{p.sieges > 1 ? "s" : ""}</li>
              <li>Durée : {p.duree_mois} mois</li>
              <li>Mises à jour continues incluses</li>
              <li>Alertes sur les paragraphes suivis</li>
              <li>Facture conforme, paiement par virement</li>
            </ul>
            <Link className="btn" href={`/compte/abonnement?formule=${p.code}`}>Choisir cette formule</Link>
          </div>
        ))}
      </div>
      <p className="muet" style={{ marginTop: 20, fontSize: ".88rem" }}>
        Paiement par virement bancaire à réception de la facture proforma ; l&apos;accès est activé dès réception du règlement.
        Les prix s&apos;entendent hors TVA (20 %).
      </p>
    </>
  );
}
