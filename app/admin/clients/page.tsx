import { db } from "@/lib/supabase/admin";
import { dateFr } from "@/lib/format";
import { changerStatut } from "../actions";

export const metadata = { title: "Clients" };

export default async function Clients() {
  const { data: orgs } = await db().from("organisations")
    .select("id, raison_sociale, ice, ville, cree_le, abonnements(id, statut, debut, fin, plan_code, cree_le), profils(id)")
    .order("cree_le", { ascending: false });
  const j = new Date().toISOString().slice(0, 10);
  return (
    <div className="pile">
      <h1 style={{ fontSize: "1.7rem" }}>Clients</h1>
      <div className="defile">
        <table className="tableau">
          <thead><tr><th>Entreprise</th><th>ICE</th><th>Utilisateurs</th><th>Formule</th><th>Statut</th><th>Fin</th><th></th></tr></thead>
          <tbody>
            {(orgs ?? []).map((o) => {
              const abos = [...(o.abonnements ?? [])].sort((a, b) => (b.cree_le > a.cree_le ? 1 : -1));
              const enCours = (x: (typeof abos)[number]) => ["actif", "essai", "suspendu"].includes(x.statut) && (x.debut ?? "") <= j && (x.fin ?? "") >= j;
              const a = abos.find(enCours) ?? abos.find((x) => (x.fin ?? "") >= j) ?? abos[0];
              return (
                <tr key={o.id}>
                  <td><b>{o.raison_sociale}</b><br /><span className="muet" style={{ fontSize: ".8rem" }}>{o.ville} · client depuis le {dateFr(o.cree_le)}</span></td>
                  <td className="num">{o.ice ?? "—"}</td>
                  <td>{o.profils?.length ?? 0}</td>
                  <td>{a?.plan_code ?? "—"}</td>
                  <td>{a ? <span className={`badge ${a.statut === "actif" ? "ok" : a.statut === "essai" ? "info" : a.statut === "suspendu" ? "alerte" : "neutre"}`}>{a.statut}</span> : "—"}</td>
                  <td>{dateFr(a?.fin)}</td>
                  <td>
                    {a?.statut === "actif" && <form action={changerStatut.bind(null, a.id, "suspendu")}><button className="btn secondaire petit">Suspendre</button></form>}
                    {a?.statut === "suspendu" && <form action={changerStatut.bind(null, a.id, "actif")}><button className="btn secondaire petit">Réactiver</button></form>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
