import type { Organisation } from "@/lib/session";

export default function ChampsOrganisation({ o }: { o?: Organisation | null }) {
  const c = (nom: keyof Organisation, libelle: string, extra?: { aide?: string; requis?: boolean; type?: string }) => (
    <label className="champ" htmlFor={nom}>
      {libelle}
      <input id={nom} name={nom} type={extra?.type ?? "text"} defaultValue={(o?.[nom] as string) ?? ""} required={extra?.requis} />
      {extra?.aide && <small>{extra.aide}</small>}
    </label>
  );
  return (
    <>
      {c("raison_sociale", "Raison sociale", { requis: true })}
      <div className="deux-col">
        {c("ice", "ICE", { aide: "15 chiffres — figure sur vos factures" })}
        {c("rc", "Registre de commerce")}
      </div>
      {c("adresse", "Adresse")}
      <div className="deux-col">
        {c("ville", "Ville")}
        {c("telephone", "Téléphone")}
      </div>
      {c("email_facturation", "E-mail de facturation", { type: "email" })}
    </>
  );
}
