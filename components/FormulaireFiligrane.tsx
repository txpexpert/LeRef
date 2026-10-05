"use client";
import { useFormState } from "react-dom";
import { identifierCopie } from "@/app/admin/actions";

export default function FormulaireFiligrane() {
  const [etat, envoyer] = useFormState(identifierCopie, undefined);
  return (
    <div className="carte">
      <form action={envoyer} className="formulaire">
        <label className="champ" htmlFor="texte">Texte copié<textarea id="texte" name="texte" rows={8} required /></label>
        <button className="btn" type="submit" style={{ justifySelf: "start" }}>Analyser</button>
      </form>
      {etat?.erreur && <p className="message erreur" style={{ marginBottom: 0 }}>{etat.erreur}</p>}
      {etat?.resultats?.map((r) => (
        <div key={r.code} className="message info" style={{ marginTop: 12 }}>
          Empreinte <span className="num">{r.code}</span> :{" "}
          {r.comptes.length ? r.comptes.map((c) => `${c.nom || c.email} (${c.email})${c.organisation ? " — " + c.organisation : ""}`).join(" ; ") : "aucun compte correspondant (visiteur ou compte supprimé)"}
        </div>
      ))}
    </div>
  );
}
