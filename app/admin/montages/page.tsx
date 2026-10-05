import { db } from "@/lib/supabase/admin";

export const metadata = { title: "Montages" };

type Rapport = { erreurs: string[]; avertissements: string[]; balises: unknown[]; ancienGabarit: string[]; prevus: number };

export default async function Montages() {
  const { data } = await db().from("imports").select("*").order("le", { ascending: false }).limit(30);
  return (
    <div className="pile">
      <h1 style={{ fontSize: "1.7rem" }}>Montages du contenu</h1>
      <p className="muet" style={{ margin: 0 }}>Chaque chargement depuis le dépôt (<span className="num">npm run montage</span> ou action GitHub) est enregistré ici avec son rapport de contrôle.</p>
      {(data ?? []).map((m) => {
        const r = m.rapport as Rapport;
        return (
          <details key={m.id} className="carte">
            <summary style={{ cursor: "pointer", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
              <b>{m.base}</b>
              <span className="muet">{new Date(m.le).toLocaleString("fr-FR")}</span>
              <span>{m.paragraphes} / {r.prevus} paragraphes</span>
              <span className={`badge ${r.erreurs.length ? "alerte" : "ok"}`}>{r.erreurs.length} erreur(s)</span>
              <span className="badge partiel">{r.balises.length} balise(s)</span>
              {!!r.ancienGabarit.length && <span className="badge neutre">{r.ancienGabarit.length} à enrichir</span>}
            </summary>
            {[...r.erreurs, ...r.avertissements].length > 0 && (
              <ul style={{ fontSize: ".86rem", marginBottom: 0 }}>{[...r.erreurs, ...r.avertissements].map((e, i) => <li key={i}>{e}</li>)}</ul>
            )}
          </details>
        );
      })}
      {!data?.length && <div className="carte muet">Aucun montage enregistré.</div>}
    </div>
  );
}
