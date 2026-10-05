import Link from "next/link";
import { exigerConnexion } from "@/lib/session";
import { db } from "@/lib/supabase/admin";
import { dateFr } from "@/lib/format";

export const metadata = { title: "Favoris et suivis" };

async function liste(table: "favoris" | "suivis", userId: string) {
  const { data } = await db().from(table).select("base, num, le").eq("user_id", userId).order("le", { ascending: false });
  if (!data?.length) return [];
  const { data: p } = await db().from("paragraphes").select("base, num, titre, maj").in("num", data.map((x) => x.num));
  return data.map((x) => ({ ...x, para: p?.find((y) => y.base === x.base && y.num === x.num) }));
}

export default async function Favoris() {
  const c = await exigerConnexion("/compte/favoris");
  const [favoris, suivis] = await Promise.all([liste("favoris", c.profil.id), liste("suivis", c.profil.id)]);
  const bloc = (titre: string, vide: string, l: Awaited<ReturnType<typeof liste>>) => (
    <div className="carte">
      <h2>{titre}</h2>
      {l.length ? (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
          {l.map((x) => (
            <li key={x.base + x.num}>
              <Link href={`/${x.base}/p/${x.num}`}><span className="num">n° {x.num}</span> {x.para?.titre ?? "Paragraphe retiré"}</Link>
              {x.para?.maj && <span className="muet" style={{ fontSize: ".82rem" }}> — mis à jour le {dateFr(x.para.maj)}</span>}
            </li>
          ))}
        </ul>
      ) : <p className="muet" style={{ margin: 0 }}>{vide}</p>}
    </div>
  );
  return (
    <div className="pile">
      <h1 style={{ fontSize: "1.7rem" }}>Favoris et suivis</h1>
      {bloc("Paragraphes suivis", "Aucun paragraphe suivi. Vous serez alerté dès qu'un paragraphe suivi est modifié.", suivis)}
      {bloc("Favoris", "Aucun favori pour l'instant.", favoris)}
    </div>
  );
}
