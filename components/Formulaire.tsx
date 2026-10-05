"use client";
// Formulaire générique relié à une action serveur, avec message de retour.
import { useFormState, useFormStatus } from "react-dom";

type Etat = { erreur?: string; ok?: string } | undefined;

function Bouton({ libelle, classe }: { libelle: string; classe?: string }) {
  const { pending } = useFormStatus();
  return <button className={`btn ${classe ?? ""}`} type="submit" disabled={pending}>{pending ? "Enregistrement…" : libelle}</button>;
}

export default function Formulaire({ action, bouton, children, classeBouton, boutons }: {
  action: (e: Etat, f: FormData) => Promise<Etat>; bouton?: string; classeBouton?: string;
  children: React.ReactNode; boutons?: React.ReactNode;
}) {
  const [etat, envoyer] = useFormState(action, undefined);
  return (
    <form action={envoyer} className="formulaire">
      {etat?.erreur && <div className="message erreur" role="alert">{etat.erreur}</div>}
      {etat?.ok && <div className="message ok">{etat.ok}</div>}
      {children}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {bouton && <Bouton libelle={bouton} classe={classeBouton} />}
        {boutons}
      </div>
    </form>
  );
}
