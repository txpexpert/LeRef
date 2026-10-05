import Link from "next/link";
import { exigerConnexion } from "@/lib/session";
import { db } from "@/lib/supabase/admin";
import { dateFr } from "@/lib/format";
import { SITE } from "@/lib/config";
import Formulaire from "@/components/Formulaire";
import ChampsOrganisation from "@/components/ChampsOrganisation";
import { creerOrganisation, modifierOrganisation } from "./actions";

export const metadata = { title: "Mon compte" };

const STATUTS: Record<string, [string, string]> = {
  essai: ["info", "Essai"], actif: ["ok", "Actif"], en_attente: ["partiel", "En attente de paiement"],
  suspendu: ["alerte", "Suspendu"], expire: ["neutre", "Expiré"], annule: ["neutre", "Annulé"],
};

export default async function Compte() {
  const c = await exigerConnexion();
  if (!c.organisation) {
    return (
      <div className="pile">
        <h1 style={{ fontSize: "1.7rem" }}>Bienvenue{c.profil.nom ? `, ${c.profil.nom}` : ""}</h1>
        <div className="carte">
          <h2>Votre entreprise</h2>
          <p className="muet" style={{ marginTop: 0 }}>Ces informations figureront sur vos factures. Vous pourrez les modifier plus tard.</p>
          <Formulaire action={creerOrganisation}
            boutons={<>
              <button className="btn" type="submit" name="essai" value="1">Démarrer l&apos;essai gratuit de {SITE.essaiJours} jours</button>
              <button className="btn secondaire" type="submit" name="essai" value="0">Enregistrer sans essai</button>
            </>}>
            <ChampsOrganisation />
          </Formulaire>
        </div>
      </div>
    );
  }

  const [{ data: suivis }, { count: lectures }] = await Promise.all([
    db().from("suivis").select("base, num, le").eq("user_id", c.profil.id),
    db().from("consultations").select("id", { count: "exact", head: true }).eq("user_id", c.profil.id)
      .gte("le", new Date(Date.now() - 30 * 864e5).toISOString()),
  ]);
  // Alertes : paragraphes suivis modifiés depuis la mise en suivi
  let alertes: { base: string; num: string; titre: string; maj: string }[] = [];
  if (suivis?.length) {
    const { data } = await db().from("paragraphes").select("base, num, titre, maj")
      .in("num", suivis.map((s) => s.num)).not("maj", "is", null);
    alertes = (data ?? []).filter((p) => {
      const s = suivis.find((x) => x.base === p.base && x.num === p.num);
      return s && p.maj > s.le.slice(0, 10);
    });
  }
  const dernier = c.abonnements[0];
  return (
    <div className="pile">
      <h1 style={{ fontSize: "1.7rem" }}>Tableau de bord</h1>
      <div className="chiffres">
        <div><span>Abonnement</span><b style={{ fontSize: "1.05rem", marginTop: 6 }}>{c.actif ? c.actif.plan.nom : "Aucun abonnement actif"}</b></div>
        <div><span>Échéance</span><b>{c.actif ? dateFr(c.actif.fin) : "—"}</b></div>
        <div><span>Paragraphes suivis</span><b>{suivis?.length ?? 0}</b></div>
        <div><span>Lectures (30 jours)</span><b>{lectures ?? 0}</b></div>
      </div>

      {!c.actif && (
        <div className="message info" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span>{dernier?.statut === "en_attente" ? "Votre commande est en attente de paiement : l'accès sera ouvert dès réception du virement." : "Choisissez une formule pour accéder aux guides."}</span>
          <Link className="btn" href={dernier?.statut === "en_attente" ? "/compte/factures" : "/compte/abonnement"}>{dernier?.statut === "en_attente" ? "Voir la proforma" : "Choisir une formule"}</Link>
        </div>
      )}

      <div className="carte">
        <h2>Alertes de mise à jour</h2>
        {alertes.length ? (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {alertes.map((a) => <li key={a.base + a.num}><Link href={`/${a.base}/p/${a.num}`}>n° {a.num} {a.titre}</Link> <span className="muet">— modifié le {dateFr(a.maj)}</span></li>)}
          </ul>
        ) : <p className="muet" style={{ margin: 0 }}>Aucune modification sur vos paragraphes suivis. Activez « Suivre ce paragraphe » depuis la page de lecture.</p>}
      </div>

      <div className="carte">
        <h2>Historique des abonnements</h2>
        <div className="defile">
          <table className="tableau">
            <thead><tr><th>Formule</th><th>Statut</th><th>Début</th><th>Fin</th></tr></thead>
            <tbody>
              {c.abonnements.map((a) => (
                <tr key={a.id}><td>{a.plan.nom}</td><td><span className={`badge ${STATUTS[a.statut]?.[0]}`}>{STATUTS[a.statut]?.[1] ?? a.statut}</span></td>
                  <td>{dateFr(a.debut)}</td><td>{dateFr(a.fin)}</td></tr>
              ))}
              {!c.abonnements.length && <tr><td colSpan={4} className="muet">Aucun abonnement pour l&apos;instant.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="carte">
        <h2>Entreprise</h2>
        {c.profil.role_org === "gestionnaire" ? (
          <Formulaire action={modifierOrganisation} bouton="Enregistrer les modifications" classeBouton="secondaire">
            <ChampsOrganisation o={c.organisation} />
          </Formulaire>
        ) : (
          <p style={{ margin: 0 }}>{c.organisation.raison_sociale} <span className="muet">— vos accès sont gérés par le gestionnaire du compte de votre entreprise.</span></p>
        )}
      </div>
    </div>
  );
}
