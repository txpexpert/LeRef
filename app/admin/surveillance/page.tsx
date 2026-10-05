import { db } from "@/lib/supabase/admin";
import { dateFr } from "@/lib/format";
import { bloquer } from "../actions";

export const metadata = { title: "Surveillance" };

type Ligne = { user_id: string; email: string; nom: string | null; raison_sociale: string | null; lectures: number; sequentielles: number; distincts: number; pct_sequentiel: number; premiere: string; derniere: string };

export default async function Surveillance() {
  const [{ data }, { data: bloques }] = await Promise.all([
    db().from("surveillance_24h").select("*").order("lectures", { ascending: false }).limit(50),
    db().from("profils").select("id, email, bloque_jusqua").gt("bloque_jusqua", new Date().toISOString()),
  ]);
  const heure = (d: string) => new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="pile">
      <h1 style={{ fontSize: "1.7rem" }}>Surveillance des consultations (24 h)</h1>
      <p className="muet" style={{ margin: 0 }}>
        Une lecture majoritairement séquentielle (7-001, 7-002, 7-003…) sur un grand volume est la signature d&apos;une aspiration automatique.
        Le blocage ferme aussi la session en cours.
      </p>
      <div className="defile">
        <table className="tableau">
          <thead><tr><th>Compte</th><th className="chiffre">Lectures</th><th className="chiffre">Paragraphes distincts</th><th className="chiffre">Séquentiel</th><th>Période</th><th></th></tr></thead>
          <tbody>
            {((data ?? []) as Ligne[]).map((l) => {
              const suspect = l.pct_sequentiel >= 60 && l.lectures >= 40;
              return (
                <tr key={l.user_id} className={suspect ? "ligne-suspecte" : undefined}>
                  <td><b>{l.nom || l.email}</b><br /><span className="muet" style={{ fontSize: ".8rem" }}>{l.email}{l.raison_sociale ? " · " + l.raison_sociale : ""}</span></td>
                  <td className="chiffre">{l.lectures}</td>
                  <td className="chiffre">{l.distincts}</td>
                  <td className="chiffre">{suspect ? <span className="badge alerte">{l.pct_sequentiel} %</span> : `${l.pct_sequentiel} %`}</td>
                  <td>{heure(l.premiere)} – {heure(l.derniere)}</td>
                  <td><div style={{ display: "flex", gap: 6 }}>
                    <form action={bloquer.bind(null, l.user_id, 24)}><button className="btn secondaire petit">Bloquer 24 h</button></form>
                    <form action={bloquer.bind(null, l.user_id, 24 * 30)}><button className="btn secondaire petit">30 jours</button></form>
                  </div></td>
                </tr>
              );
            })}
            {!data?.length && <tr><td colSpan={6} className="muet">Aucune consultation sur les dernières 24 heures.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="carte">
        <h2>Comptes bloqués</h2>
        {bloques?.length ? (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {bloques.map((b) => (
              <li key={b.id} style={{ marginBottom: 6 }}>{b.email} — jusqu&apos;au {dateFr(b.bloque_jusqua)}{" "}
                <form action={bloquer.bind(null, b.id, 0)} style={{ display: "inline" }}><button className="btn secondaire petit">Débloquer</button></form>
              </li>
            ))}
          </ul>
        ) : <p className="muet" style={{ margin: 0 }}>Aucun compte bloqué.</p>}
      </div>
    </div>
  );
}
