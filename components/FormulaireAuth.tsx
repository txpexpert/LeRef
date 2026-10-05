"use client";
import { useFormState, useFormStatus } from "react-dom";
import Turnstile from "./Turnstile";
import type { Etat } from "@/app/connexion/actions";

type Champ = { nom: string; libelle: string; type?: string; aide?: string; auto?: string };

function Bouton({ libelle }: { libelle: string }) {
  const { pending } = useFormStatus();
  return <button className="btn" type="submit" disabled={pending}>{pending ? "Veuillez patienter…" : libelle}</button>;
}

export default function FormulaireAuth({ action, champs, bouton, cache, antiRobot = true }: {
  action: (e: Etat, f: FormData) => Promise<Etat>; champs: Champ[]; bouton: string;
  cache?: Record<string, string>; antiRobot?: boolean;
}) {
  const [etat, envoyer] = useFormState(action, undefined);
  if (etat?.ok) return <div className="message ok">{etat.ok}</div>;
  return (
    <form action={envoyer} className="formulaire">
      {etat?.erreur && <div className="message erreur" role="alert">{etat.erreur}</div>}
      {Object.entries(cache ?? {}).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {champs.map((c) => (
        <label key={c.nom} className="champ" htmlFor={c.nom}>
          {c.libelle}
          <input id={c.nom} name={c.nom} type={c.type ?? "text"} required autoComplete={c.auto} />
          {c.aide && <small>{c.aide}</small>}
        </label>
      ))}
      {antiRobot && <Turnstile />}
      <Bouton libelle={bouton} />
    </form>
  );
}
