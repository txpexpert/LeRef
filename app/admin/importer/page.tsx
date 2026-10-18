import Link from "next/link";
import { db } from "@/lib/supabase/admin";
import Importeur from "@/components/Importeur";

export const metadata = { title: "Importer des fichiers" };

export default async function Importer() {
  const [{ data: bases }, { data: derniers }] = await Promise.all([
    db().from("bases").select("slug, titre, publie, code").order("ordre"),
    db().from("imports").select("id, base, le, origine, fichiers, auteur, paragraphes").order("le", { ascending: false }).limit(8),
  ]);
  return (
    <div className="pile">
      <h1 style={{ fontSize: "1.7rem" }}>Importer des fichiers</h1>
      <p className="muet" style={{ margin: 0 }}>
        Chaque fichier commence par le slug de son guide (douane_, fiscal_, commerce-exterieur_…) : le guide est choisi
        automatiquement et un fichier d&apos;un autre guide est refusé. Déposez un ou plusieurs fichiers modifiés (chapitre, plan, liminaires, parcours, modèles, logigrammes et leurs images,
        bases.json, dossiers.json). Le site est mis à jour dès la publication : seuls les paragraphes réellement modifiés
        sont réécrits, et leur version précédente est archivée.
      </p>
      <Importeur bases={(bases ?? []).map((b) => ({ slug: b.slug, titre: b.titre, publie: b.publie, code: b.code ?? null }))} />
      <div className="carte">
        <div className="titre-section" style={{ marginBottom: 8 }}><h2 style={{ margin: 0 }}>Derniers imports</h2><Link href="/admin/montages">Tous les rapports</Link></div>
        <div className="defile">
          <table className="tableau">
            <thead><tr><th>Date</th><th>Guide</th><th>Voie</th><th>Fichiers</th><th className="chiffre">Paragraphes</th></tr></thead>
            <tbody>
              {(derniers ?? []).map((i) => (
                <tr key={i.id}>
                  <td>{new Date(i.le).toLocaleString("fr-FR")}</td><td>{i.base}</td>
                  <td><span className={`badge ${i.origine === "import-admin" ? "info" : "neutre"}`}>{i.origine === "import-admin" ? `import · ${i.auteur ?? ""}` : "montage"}</span></td>
                  <td style={{ fontSize: ".82rem" }}>{(i.fichiers ?? []).slice(0, 4).join(", ")}{(i.fichiers?.length ?? 0) > 4 ? ` +${i.fichiers.length - 4}` : ""}</td>
                  <td className="chiffre">{i.paragraphes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
